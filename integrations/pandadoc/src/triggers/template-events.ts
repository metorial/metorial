import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

let templateWebhookEvents = ['template_created', 'template_updated', 'template_deleted'];

export let templateEvents = SlateTrigger.create(spec, {
  name: 'Template Events',
  key: 'template_events',
  description:
    'Triggers when template-related events occur, including template creation, updates, and deletions.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the webhook event'),
      templateId: z.string().describe('UUID of the affected template'),
      templateName: z.string().optional().describe('Name of the template'),
      dateCreated: z.string().optional().describe('Template creation date'),
      dateModified: z.string().optional().describe('Template last modified date'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('UUID of the affected template'),
      templateName: z.string().optional().describe('Template name'),
      dateCreated: z.string().optional().describe('Template creation date'),
      dateModified: z.string().optional().describe('Template last modified date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new PandaDocClient({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      let subscription = await client.createWebhookSubscription({
        name: 'Slates Template Events',
        url: ctx.input.webhookBaseUrl,
        active: true,
        triggers: templateWebhookEvents
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.uuid || subscription.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new PandaDocClient({
        token: ctx.auth.token,
        authType: ctx.auth.authType
      });

      await client.deleteWebhookSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let body = await ctx.request.json();

      let events: any[] = Array.isArray(body) ? body : [body];

      let inputs = events.map((event: any) => {
        let data = event.data || event;

        return {
          eventType: event.event || 'unknown',
          templateId: data.id || '',
          templateName: data.name,
          dateCreated: data.date_created,
          dateModified: data.date_modified,
          rawPayload: event
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        template_created: 'template.created',
        template_updated: 'template.updated',
        template_deleted: 'template.deleted'
      };

      let type = eventTypeMap[ctx.input.eventType] || `template.${ctx.input.eventType}`;

      let uniqueId = `${ctx.input.eventType}_${ctx.input.templateId}_${ctx.input.dateModified || Date.now()}`;

      return {
        type,
        id: uniqueId,
        output: {
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          dateCreated: ctx.input.dateCreated,
          dateModified: ctx.input.dateModified
        }
      };
    }
  })
  .build();
