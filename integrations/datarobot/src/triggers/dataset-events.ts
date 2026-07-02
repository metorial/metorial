import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let datasetEvents = SlateTrigger.create(spec, {
  name: 'Dataset Events',
  key: 'dataset_events',
  description:
    'Receive webhook notifications for dataset lifecycle events in the AI Catalog including dataset creation, deletion, and sharing.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of dataset event'),
      eventId: z.string().describe('Unique event identifier'),
      datasetId: z.string().optional().describe('Affected dataset ID'),
      payload: z.any().describe('Raw event payload from DataRobot')
    })
  )
  .output(
    z.object({
      datasetId: z.string().optional().describe('Affected dataset ID'),
      datasetName: z.string().optional().describe('Dataset name'),
      status: z.string().optional().describe('Event status'),
      userId: z.string().optional().describe('User who triggered the event'),
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
        name: 'Slates Dataset Events',
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
      let datasetId = data.datasetId || data.dataset_id || data.entityId || data.entity_id;

      return {
        inputs: [
          {
            eventType,
            eventId: String(eventId),
            datasetId,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, payload, datasetId } = ctx.input;

      let normalizedType = eventType
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase()
        .replace(/^_/, '')
        .replace(/__+/g, '_');

      if (!normalizedType.startsWith('dataset')) {
        normalizedType = `dataset.${normalizedType}`;
      } else {
        normalizedType = normalizedType.replace('_', '.');
      }

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          datasetId: datasetId || payload.datasetId || payload.dataset_id || payload.entityId,
          datasetName: payload.datasetName || payload.name,
          status: payload.status,
          userId: payload.userId || payload.user_id || payload.uid,
          message: payload.message || payload.description,
          timestamp: payload.timestamp || payload.createdAt || payload.occurredAt
        }
      };
    }
  })
  .build();
