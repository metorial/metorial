import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let platformEvents = SlateTrigger.create(spec, {
  name: 'Platform Events',
  key: 'platform_events',
  description:
    'Receives webhook notifications for Northflank platform events including builds, job runs, backups, billing, autoscaling, and infrastructure alerts.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type identifier, e.g. build:start, job:success'),
      eventId: z.string().describe('Unique event ID'),
      notificationId: z.string().optional().describe('Notification integration ID'),
      notificationName: z.string().optional().describe('Notification integration name'),
      payload: z.any().describe('Full event payload from Northflank')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Normalized event type'),
      resourceId: z.string().optional().describe('ID of the affected resource'),
      resourceName: z.string().optional().describe('Name of the affected resource'),
      projectId: z.string().optional().describe('Project ID if applicable'),
      serviceName: z.string().optional().describe('Service name if applicable'),
      jobName: z.string().optional().describe('Job name if applicable'),
      addonName: z.string().optional().describe('Addon name if applicable'),
      message: z.string().optional().describe('Human-readable event message'),
      raw: z.any().optional().describe('Raw event payload')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      let secret = generateSecret();

      let result = await client.createNotificationIntegration({
        name: `slates-webhook-${Date.now()}`,
        type: 'RAW_WEBHOOK',
        webhook: ctx.input.webhookBaseUrl,
        secret,
        events: {
          'build:start': true,
          'build:success': true,
          'build:failure': true,
          'build:abort': true,
          'job:start': true,
          'job:success': true,
          'job:failure': true,
          'job:abort': true,
          'job:terminate': true,
          'backup:start': true,
          'backup:success': true,
          'backup:failure': true,
          'backup:abort': true,
          'autoscaling:scale': true,
          'infrastructure:container-crash': true,
          'infrastructure:container-eviction': true,
          'infrastructure:cpu-alert': true,
          'infrastructure:memory-alert': true,
          'infrastructure:volume-75': true,
          'infrastructure:volume-90': true,
          'billing:alert-exceeded': true,
          'release-flow:queued': true,
          'release-flow:started': true,
          'release-flow:succeeded': true,
          'release-flow:failed': true
        }
      });

      return {
        registrationDetails: {
          notificationId: result?.id,
          secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        teamId: ctx.config.teamId
      });

      let notificationId = ctx.input.registrationDetails?.notificationId;
      if (notificationId) {
        await client.deleteNotificationIntegration(notificationId);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      let eventType =
        ctx.request.headers.get('x-northflank-notification-integration-event-type') ||
        body?.type ||
        'unknown';
      let eventId =
        ctx.request.headers.get('x-northflank-notification-integration-event-id') ||
        body?.id ||
        `evt-${Date.now()}`;
      let notificationId =
        ctx.request.headers.get('x-northflank-notification-integration-id') || undefined;
      let notificationName =
        ctx.request.headers.get('x-northflank-notification-integration-name') || undefined;

      return {
        inputs: [
          {
            eventType,
            eventId,
            notificationId,
            notificationName,
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, payload } = ctx.input;

      let normalizedType = eventType.replace(/:/g, '.');

      let resourceId =
        payload?.resourceId ||
        payload?.serviceId ||
        payload?.jobId ||
        payload?.addonId ||
        payload?.id;
      let resourceName =
        payload?.resourceName ||
        payload?.serviceName ||
        payload?.jobName ||
        payload?.addonName ||
        payload?.name;
      let projectId = payload?.projectId;
      let serviceName = payload?.serviceName;
      let jobName = payload?.jobName;
      let addonName = payload?.addonName;
      let message = payload?.message || payload?.description || `Event: ${eventType}`;

      return {
        type: normalizedType,
        id: eventId,
        output: {
          eventType: normalizedType,
          resourceId,
          resourceName,
          projectId,
          serviceName,
          jobName,
          addonName,
          message,
          raw: payload
        }
      };
    }
  })
  .build();

let generateSecret = (): string => {
  let chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
