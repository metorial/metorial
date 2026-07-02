import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let appWebhook = SlateTrigger.create(spec, {
  name: 'App Webhook',
  key: 'app_webhook',
  description:
    'Receives webhook notifications when changes occur on Heroku apps, including app updates, dyno events, add-on changes, builds, releases, domain changes, collaborator changes, and formation updates.'
})
  .input(
    z.object({
      webhookEventId: z.string().describe('Unique identifier of the webhook event'),
      entityType: z
        .string()
        .describe('Entity type that triggered the event (e.g., "api:app", "api:release")'),
      actionType: z.string().describe('Action type (create, update, destroy)'),
      resourceId: z.string().describe('ID of the affected resource'),
      appId: z.string().describe('ID of the app this event belongs to'),
      appName: z.string().describe('Name of the app'),
      actorEmail: z.string().describe('Email of the user who performed the action'),
      actorId: z.string().describe('ID of the user who performed the action'),
      eventPayload: z.any().describe('Raw event data from the webhook')
    })
  )
  .output(
    z.object({
      entityType: z.string().describe('Entity type that triggered the event'),
      actionType: z.string().describe('Action type (create, update, destroy)'),
      resourceId: z.string().describe('ID of the affected resource'),
      appId: z.string().describe('ID of the app'),
      appName: z.string().describe('Name of the app'),
      actorEmail: z.string().describe('Email of the user who performed the action'),
      actorId: z.string().describe('ID of the actor'),
      previousData: z
        .any()
        .optional()
        .describe('Previous state of the resource (for update events)'),
      currentData: z.any().optional().describe('Current state of the resource')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // We need an app to register webhooks against. The webhook URL is app-specific.
      // The platform provides the base URL; we'll register for all supported entity types.
      // Since Heroku webhooks are per-app, we need the user to have specified an app.
      // We'll list apps and register on each one, or the user can configure which app.
      // For now, we register one webhook and include all entity types.

      // Note: The caller should configure which app to monitor.
      // We'll store the app and webhook ID for unregistration.

      // Since we can't determine the app from ctx alone, we'll need the user
      // to have configured it. Let's use a convention where the webhook URL
      // contains enough info.

      // For a general approach: we list all apps and register webhooks on each.
      // However, the spec says max 10 per app, so let's keep it manageable.
      // In practice, the platform should handle app selection via config or input.

      // For simplicity, we'll look at all apps and register on each
      let apps = await client.listApps();
      let registrations: Array<{ appId: string; appName: string; webhookId: string }> = [];

      let allEntityTypes = [
        'api:addon',
        'api:addon-attachment',
        'api:app',
        'api:build',
        'api:collaborator',
        'api:domain',
        'api:dyno',
        'api:formation',
        'api:release',
        'api:sni-endpoint'
      ];

      for (let app of apps) {
        try {
          let webhook = await client.createWebhook(app.name, {
            include: allEntityTypes,
            level: 'sync',
            url: ctx.input.webhookBaseUrl
          });
          registrations.push({
            appId: app.appId,
            appName: app.name,
            webhookId: webhook.webhookId
          });
        } catch (e) {
          ctx.warn(`Failed to register webhook for app ${app.name}: ${e}`);
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let { registrations } = ctx.input.registrationDetails as {
        registrations: Array<{ appId: string; appName: string; webhookId: string }>;
      };

      for (let reg of registrations) {
        try {
          await client.deleteWebhook(reg.appName, reg.webhookId);
        } catch (_e) {
          // Ignore errors during unregistration (app may have been deleted)
        }
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      // Heroku webhook payload structure:
      // {
      //   "id": "event-uuid",
      //   "action": "create|update|destroy",
      //   "resource": "addon|app|build|...",
      //   "data": { ... resource data ... },
      //   "previous_data": { ... },
      //   "actor": { "email": "...", "id": "..." },
      //   "created_at": "...",
      //   "published_at": "...",
      //   "webhook": { "id": "..." }
      // }

      let eventId = body.id || `${body.resource}-${body.action}-${Date.now()}`;
      let entityType = body.resource ? `api:${body.resource}` : 'unknown';
      let actionType = body.action || 'unknown';
      let resourceData = body.data || {};
      let resourceId = resourceData.id || '';
      let appId = resourceData.app?.id || resourceData.id || '';
      let appName = resourceData.app?.name || resourceData.name || '';
      let actorEmail = body.actor?.email || '';
      let actorId = body.actor?.id || '';

      return {
        inputs: [
          {
            webhookEventId: eventId,
            entityType,
            actionType,
            resourceId,
            appId,
            appName,
            actorEmail,
            actorId,
            eventPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        webhookEventId,
        entityType,
        actionType,
        resourceId,
        appId,
        appName,
        actorEmail,
        actorId,
        eventPayload
      } = ctx.input;

      // Normalize entity type for the event type string
      let normalizedEntity = entityType.replace('api:', '').replace(/-/g, '_');
      let eventType = `${normalizedEntity}.${actionType}`;

      return {
        type: eventType,
        id: webhookEventId,
        output: {
          entityType,
          actionType,
          resourceId,
          appId,
          appName,
          actorEmail,
          actorId,
          previousData: eventPayload.previous_data || undefined,
          currentData: eventPayload.data || undefined
        }
      };
    }
  })
  .build();
