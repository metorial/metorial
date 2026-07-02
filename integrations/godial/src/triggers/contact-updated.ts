import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let contactUpdated = SlateTrigger.create(spec, {
  name: 'Contact Updated',
  key: 'contact_updated',
  description:
    'Triggers when a contact is updated in GoDial. Configure the webhook URL in GoDial under Integrations → Web Hook, select the contact update event, and paste the provided webhook URL.'
})
  .input(
    z.object({
      eventPayload: z.any().describe('Raw contact update event payload from GoDial')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the updated contact'),
      contactName: z.string().optional().describe('Name of the contact'),
      phone: z.string().optional().describe('Primary phone number of the contact'),
      email: z.string().optional().describe('Email address of the contact'),
      companyName: z.string().optional().describe('Company name of the contact'),
      listId: z.string().optional().describe('ID of the list the contact belongs to'),
      remarks: z.string().optional().describe('Remarks or tags on the contact'),
      modifiedOn: z
        .string()
        .optional()
        .describe('Timestamp when the contact was last modified'),
      contactDetails: z.any().describe('Full contact update data from GoDial')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data) {
        return { inputs: [] };
      }

      // GoDial may send a single event or an array
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          eventPayload: event
        }))
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload || {};

      let contactId = payload.contactId || payload.id || payload._id || '';
      let modifiedOn = payload.modifiedOn || payload.updatedAt || '';
      let uniqueId = payload.eventId || `${contactId}-${modifiedOn || Date.now()}`;

      return {
        type: 'contact.updated',
        id: String(uniqueId),
        output: {
          contactId: contactId || undefined,
          contactName: payload.name || payload.contactName,
          phone: payload.phone || payload.number,
          email: payload.email,
          companyName: payload.companyName,
          listId: payload.listId,
          remarks: payload.remarks,
          modifiedOn: modifiedOn || undefined,
          contactDetails: payload
        }
      };
    }
  })
  .build();
