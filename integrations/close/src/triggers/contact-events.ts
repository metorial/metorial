import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let contactEventsTrigger = SlateTrigger.create(spec, {
  name: 'Contact Events',
  key: 'contact_events',
  description: 'Triggers when a contact is created, updated, or deleted in Close.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action that occurred (created, updated, deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      objectId: z.string().describe('ID of the affected contact'),
      objectType: z.string().describe('Object type (contact)'),
      changedFields: z
        .array(z.string())
        .optional()
        .describe('Fields that changed during an update'),
      currentData: z.any().optional().describe('Current data after the change'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event was created')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the affected contact'),
      action: z.string().describe('The action that occurred'),
      changedFields: z.array(z.string()).optional().describe('Fields that changed'),
      leadId: z.string().optional().describe('ID of the parent lead'),
      contactName: z.string().optional().describe('Name of the contact'),
      title: z.string().optional().describe('Contact title'),
      emails: z
        .array(
          z.object({
            email: z.string(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Contact email addresses'),
      phones: z
        .array(
          z.object({
            phone: z.string(),
            type: z.string().optional()
          })
        )
        .optional()
        .describe('Contact phone numbers'),
      userId: z.string().optional().describe('User who triggered the event'),
      dateCreated: z.string().optional().describe('When the event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [
          { object_type: 'contact', action: 'created' },
          { object_type: 'contact', action: 'updated' },
          { object_type: 'contact', action: 'deleted' }
        ],
        status: 'active'
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signatureKey: webhook.signature_key
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      if (!data?.event) {
        return { inputs: [] };
      }

      let event = data.event;

      return {
        inputs: [
          {
            eventAction: event.action || data.action || 'unknown',
            eventId: event.id || data.id || `${event.object_id}_${event.date_created}`,
            objectId: event.object_id || '',
            objectType: event.object_type || 'contact',
            changedFields: event.changed_fields,
            currentData: event.data,
            userId: event.user_id,
            dateCreated: event.date_created
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let currentData = ctx.input.currentData || {};

      return {
        type: `contact.${ctx.input.eventAction}`,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.objectId,
          action: ctx.input.eventAction,
          changedFields: ctx.input.changedFields,
          leadId: currentData.lead_id,
          contactName: currentData.name || currentData.display_name,
          title: currentData.title,
          emails: currentData.emails?.map((e: any) => ({ email: e.email, type: e.type })),
          phones: currentData.phones?.map((p: any) => ({ phone: p.phone, type: p.type })),
          userId: ctx.input.userId,
          dateCreated: ctx.input.dateCreated
        }
      };
    }
  })
  .build();
