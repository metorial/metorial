import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ActiveTrailClient } from '../lib/client';
import { spec } from '../spec';

export let contactChangeTrigger = SlateTrigger.create(spec, {
  name: 'Contact Changed',
  key: 'contact_changed',
  description:
    'Triggered when a contact is created, updated, or has their status changed — either programmatically (via API, forms, landing pages) or manually through the ActiveTrail UI.'
})
  .input(
    z.object({
      changeType: z.string().optional().describe('Type of contact change'),
      contactData: z
        .record(z.string(), z.any())
        .describe('Full contact data from the webhook payload'),
      webhookId: z.string().optional().describe('Webhook event identifier')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('Contact ID'),
      email: z.string().nullable().optional().describe('Contact email'),
      sms: z.string().nullable().optional().describe('Contact SMS number'),
      firstName: z.string().nullable().optional().describe('First name'),
      lastName: z.string().nullable().optional().describe('Last name'),
      status: z.string().nullable().optional().describe('Contact status'),
      changeType: z.string().optional().describe('Type of change that occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ActiveTrailClient(ctx.auth.token);

      // Register webhook for external/programmatic contact changes
      let externalWebhook = await client.createWebhook({
        name: 'Slates - Contact External Change',
        url: `${ctx.input.webhookBaseUrl}/external`,
        event_type: 'ContactExternalChange',
        is_active: true
      });

      // Register webhook for manual contact changes
      let manualWebhook = await client.createWebhook({
        name: 'Slates - Contact Manual Change',
        url: `${ctx.input.webhookBaseUrl}/manual`,
        event_type: 'ContactManualChange',
        is_active: true
      });

      return {
        registrationDetails: {
          externalWebhookId: externalWebhook.id,
          manualWebhookId: manualWebhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ActiveTrailClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as {
        externalWebhookId: number;
        manualWebhookId: number;
      };

      if (details.externalWebhookId) {
        await client.deleteWebhook(details.externalWebhookId);
      }
      if (details.manualWebhookId) {
        await client.deleteWebhook(details.manualWebhookId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let url = ctx.request.url;

      let changeType = 'unknown';
      if (url.includes('/external')) {
        changeType = 'external';
      } else if (url.includes('/manual')) {
        changeType = 'manual';
      }

      // ActiveTrail can send a single object or array
      let items = Array.isArray(data) ? data : [data];

      return {
        inputs: items.map((item: any, index: number) => ({
          changeType,
          contactData: item,
          webhookId: `${Date.now()}-${index}`
        }))
      };
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contactData as Record<string, any>;
      let contactId = (contact.id || contact.contact_id) as number | undefined;
      let eventId = ctx.input.webhookId || `${contactId}-${Date.now()}`;

      return {
        type: `contact.${ctx.input.changeType || 'changed'}`,
        id: eventId,
        output: {
          contactId: contactId,
          email: contact.email as string | null | undefined,
          sms: contact.sms as string | null | undefined,
          firstName: contact.first_name as string | null | undefined,
          lastName: contact.last_name as string | null | undefined,
          status: contact.status as string | null | undefined,
          changeType: ctx.input.changeType
        }
      };
    }
  })
  .build();
