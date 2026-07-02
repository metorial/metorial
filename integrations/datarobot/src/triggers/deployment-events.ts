import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let deploymentEvents = SlateTrigger.create(spec, {
  name: 'Deployment Events',
  key: 'deployment_events',
  description:
    'Receive webhook notifications for deployment lifecycle and health events including creation, deletion, model replacement, and health status changes (service health, data drift, accuracy).'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of deployment event'),
      eventId: z.string().describe('Unique event identifier'),
      deploymentId: z.string().optional().describe('Affected deployment ID'),
      payload: z.any().describe('Raw event payload from DataRobot')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().optional().describe('Affected deployment ID'),
      label: z.string().optional().describe('Deployment label'),
      status: z.string().optional().describe('Deployment or health status'),
      previousStatus: z
        .string()
        .optional()
        .describe('Previous health status (for status change events)'),
      modelId: z.string().optional().describe('Model ID involved'),
      message: z.string().optional().describe('Event message or description'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new DataRobotClient({
        token: ctx.auth.token,
        endpointUrl: ctx.config.endpointUrl
      });

      let channel = await client.createNotificationChannel({
        channelType: 'Webhook',
        name: 'Slates Deployment Events',
        payloadUrl: ctx.input.webhookBaseUrl,
        contentType: 'application/json',
        validateSsl: true
      });

      return {
        registrationDetails: {
          channelId: channel.id || channel.channelId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let channelId = ctx.input.registrationDetails?.channelId;
      if (!channelId) return;

      let client = new DataRobotClient({
        token: ctx.auth.token,
        endpointUrl: ctx.config.endpointUrl
      });

      try {
        await client.deleteNotificationChannel(channelId);
      } catch (err: any) {
        if (err?.response?.status !== 404) throw err;
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data) return { inputs: [] };

      let eventType = data.eventType || data.event_type || data.type || 'unknown';
      let eventId = data.eventId || data.id || `${eventType}_${Date.now()}`;
      let deploymentId =
        data.deploymentId || data.deployment_id || data.entityId || data.entity_id;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            deploymentId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, payload, deploymentId } = ctx.input;

      let normalizedType = eventType
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/__+/g, '_');

      if (!normalizedType.startsWith('deployment')) {
        normalizedType = `deployment.${normalizedType}`;
      } else {
        normalizedType = normalizedType.replace('_', '.');
      }

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          deploymentId:
            deploymentId || payload.deploymentId || payload.deployment_id || payload.entityId,
          label: payload.label || payload.deploymentLabel || payload.name,
          status: payload.status || payload.currentStatus || payload.newStatus,
          previousStatus: payload.previousStatus || payload.oldStatus,
          modelId: payload.modelId || payload.model_id,
          message: payload.message || payload.description,
          timestamp: payload.timestamp || payload.createdAt || payload.occurredAt
        }
      };
    }
  })
  .build();
