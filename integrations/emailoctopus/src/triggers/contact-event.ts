import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvent = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description:
    'Fires when a contact is created, updated, deleted, bounced, clicked, complained, opened, or unsubscribed. Webhooks must be configured in the EmailOctopus dashboard under Integrations & APIs → Webhooks.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique identifier of the event'),
      eventType: z.string().describe('Type of event (e.g., contact.created, contact.updated)'),
      listId: z.string().describe('ID of the list the contact belongs to'),
      contactId: z.string().describe('ID of the affected contact'),
      contactEmailAddress: z.string().describe('Email address of the contact'),
      contactFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values'),
      contactTags: z.array(z.string()).optional().describe('Tags assigned to the contact'),
      contactStatus: z.string().optional().describe('Subscription status of the contact'),
      campaignId: z
        .string()
        .optional()
        .describe('Associated campaign ID (for campaign-related events)'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the event occurred')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('ID of the list the contact belongs to'),
      contactId: z.string().describe('ID of the affected contact'),
      contactEmailAddress: z.string().describe('Email address of the contact'),
      contactFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values'),
      contactTags: z.array(z.string()).optional().describe('Tags assigned to the contact'),
      contactStatus: z.string().optional().describe('Subscription status of the contact'),
      campaignId: z
        .string()
        .optional()
        .describe('Associated campaign ID (for campaign-related events)'),
      occurredAt: z.string().describe('ISO 8601 timestamp of when the event occurred')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any[];

      // EmailOctopus sends an array of up to 1000 events per webhook request
      let events = Array.isArray(body) ? body : [body];

      return {
        inputs: events.map((event: any) => ({
          eventId: event.id,
          eventType: event.type,
          listId: event.list_id,
          contactId: event.contact_id,
          contactEmailAddress: event.contact_email_address,
          contactFields: event.contact_fields,
          contactTags: event.contact_tags,
          contactStatus: event.contact_status,
          campaignId: event.campaign_id,
          occurredAt: event.occurred_at
        }))
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          listId: ctx.input.listId,
          contactId: ctx.input.contactId,
          contactEmailAddress: ctx.input.contactEmailAddress,
          contactFields: ctx.input.contactFields,
          contactTags: ctx.input.contactTags,
          contactStatus: ctx.input.contactStatus,
          campaignId: ctx.input.campaignId,
          occurredAt: ctx.input.occurredAt
        }
      };
    }
  })
  .build();
