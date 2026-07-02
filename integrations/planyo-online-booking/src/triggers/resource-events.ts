import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { RESOURCE_EVENTS } from '../lib/webhook-events';
import { spec } from '../spec';

export let resourceEvents = SlateTrigger.create(spec, {
  name: 'Resource Events',
  key: 'resource_events',
  description:
    'Triggers when resource settings are changed, a resource is removed, or a vacation/unavailability period is modified.'
})
  .input(
    z.object({
      notificationType: z.string().describe('Planyo event code'),
      resourceId: z.string().optional().describe('Resource ID'),
      siteId: z.string().optional().describe('Site ID'),
      rawPayload: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      resourceId: z.string().optional().describe('Resource ID'),
      siteId: z.string().optional().describe('Site ID'),
      eventSubtype: z.string().optional().describe('Event subtype or update type'),
      vacationUpdateType: z
        .string()
        .optional()
        .describe('Vacation update type: new, modified, or removed'),
      vacationStartTime: z.string().optional().describe('Vacation start time'),
      vacationEndTime: z.string().optional().describe('Vacation end time'),
      vacationType: z.string().optional().describe('Vacation recurrence type'),
      isSiteVacation: z.boolean().optional().describe('Whether this is a site-level vacation')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let webhookUrl = `${ctx.input.webhookBaseUrl}?ppp_payload=json`;

      let registeredEvents: string[] = [];
      for (let eventCode of RESOURCE_EVENTS) {
        try {
          await client.addNotificationCallback(eventCode, webhookUrl);
          registeredEvents.push(eventCode);
        } catch (_e) {
          // Continue
        }
      }

      return {
        registrationDetails: {
          webhookUrl,
          registeredEvents
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PlanyoClient(ctx.auth, ctx.config);
      let details = ctx.input.registrationDetails as {
        webhookUrl: string;
        registeredEvents: string[];
      };

      for (let eventCode of details.registeredEvents) {
        try {
          await client.removeNotificationCallback(eventCode, details.webhookUrl);
        } catch (_e) {
          // Best effort
        }
      }
    },

    handleRequest: async ctx => {
      let data: Record<string, any>;
      let contentType = ctx.request.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, any>;
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let notificationType = data.notification_type || '';
      let resourceId = data.resource_id
        ? String(data.resource_id)
        : data.resource
          ? String(data.resource)
          : undefined;

      return {
        inputs: [
          {
            notificationType,
            resourceId,
            siteId: data.site_id
              ? String(data.site_id)
              : data.calendar
                ? String(data.calendar)
                : undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;
      let raw = input.rawPayload || {};

      let eventType = 'resource.updated';
      if (input.notificationType === 'resource_removed') {
        eventType = 'resource.removed';
      } else if (input.notificationType === 'vacation_modified') {
        eventType = 'resource.vacation_modified';
      } else if (input.notificationType === 'resource_settings_changed') {
        eventType = 'resource.settings_changed';
      }

      return {
        type: eventType,
        id: `${input.resourceId || input.siteId || 'unknown'}-${input.notificationType}-${Date.now()}`,
        output: {
          resourceId: input.resourceId,
          siteId: input.siteId,
          eventSubtype: raw.subtype || raw.type,
          vacationUpdateType: raw.update_type,
          vacationStartTime: raw.start_time ? String(raw.start_time) : undefined,
          vacationEndTime: raw.end_time ? String(raw.end_time) : undefined,
          vacationType: raw.vacation_type ? String(raw.vacation_type) : undefined,
          isSiteVacation:
            raw.is_site_vacation === '1' ||
            raw.is_site_vacation === 1 ||
            raw.is_site_vacation === true
        }
      };
    }
  })
  .build();
