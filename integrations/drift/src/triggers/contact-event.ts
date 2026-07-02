import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactEvent = SlateTrigger.create(spec, {
  name: 'Contact Event',
  key: 'contact_event',
  description:
    'Triggers on contact events including contact identification, contact updates, and phone number capture.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of contact event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      contactId: z.number().optional().describe('Contact ID'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Captured phone number'),
      attributes: z.record(z.string(), z.any()).optional().describe('Contact attributes'),
      changedAttributes: z
        .array(z.string())
        .optional()
        .describe('Names of changed attributes (for update events)'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('Drift contact ID'),
      email: z.string().optional().describe('Contact email'),
      phone: z.string().optional().describe('Captured phone number'),
      attributes: z.record(z.string(), z.any()).optional().describe('Contact attributes'),
      changedAttributes: z
        .array(z.string())
        .optional()
        .describe('Names of changed attributes'),
      createdAt: z.number().optional().describe('Event timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.type || 'unknown';
      let eventData = data.data || {};
      let timestamp = data.createdAt || Date.now();

      let supportedTypes = ['contact_identified', 'contact_updated', 'phone_captured'];

      if (!supportedTypes.includes(eventType)) {
        return { inputs: [] };
      }

      let contactId = eventData.contactId || eventData.id;
      let email = eventData.email || eventData.attributes?.email;
      let phone = eventType === 'phone_captured' ? eventData.phone : undefined;

      return {
        inputs: [
          {
            eventType,
            eventId: `${eventType}-${contactId}-${timestamp}`,
            contactId,
            email,
            phone,
            attributes: eventData.attributes,
            changedAttributes: eventData.changedAttributes,
            createdAt: timestamp
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `contact.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          contactId: ctx.input.contactId,
          email: ctx.input.email,
          phone: ctx.input.phone,
          attributes: ctx.input.attributes,
          changedAttributes: ctx.input.changedAttributes,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
