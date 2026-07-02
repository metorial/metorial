import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvent = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description:
    'Triggers when a contact is created, updated, when tags are changed, or when the assignee is updated.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of contact event (contact.created, contact.updated, contact.tag_updated, contact.assignee_updated)'
        ),
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Current tags on the contact'),
      assignee: z.any().optional().describe('Current assignee'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      timestamp: z.string().optional().describe('Event timestamp'),
      rawPayload: z.any().optional().describe('Full raw event payload')
    })
  )
  .output(
    z.object({
      contactId: z.string().describe('ID of the contact'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      tags: z.array(z.string()).optional().describe('Current tags'),
      assignee: z.any().optional().describe('Current assignee'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      timestamp: z.string().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      let event = data?.event || data?.type || 'contact.updated';
      let payload = data?.data || data;

      let contact = payload?.contact || payload;

      let normalizedEvent = event;
      if (event === 'contact.tag_updated' || event === 'contact_tag_updated') {
        normalizedEvent = 'contact.tag_updated';
      } else if (
        event === 'contact.assignee_updated' ||
        event === 'contact_assignee_updated'
      ) {
        normalizedEvent = 'contact.assignee_updated';
      } else if (event === 'contact.created' || event === 'contact_created') {
        normalizedEvent = 'contact.created';
      } else {
        normalizedEvent = 'contact.updated';
      }

      return {
        inputs: [
          {
            eventType: normalizedEvent,
            contactId: String(contact?.id || ''),
            firstName: contact?.firstName,
            lastName: contact?.lastName,
            email: contact?.email,
            phone: contact?.phone,
            tags: contact?.tags,
            assignee: contact?.assignee,
            customFields: contact?.custom_fields || contact?.customFields,
            timestamp: contact?.updatedAt || contact?.createdAt || payload?.timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.contactId}-${ctx.input.eventType}-${ctx.input.timestamp || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          tags: ctx.input.tags,
          assignee: ctx.input.assignee,
          customFields: ctx.input.customFields,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
