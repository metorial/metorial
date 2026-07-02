import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callCompleted = SlateTrigger.create(spec, {
  name: 'Call Completed',
  key: 'call_completed',
  description:
    'Triggers when a call is completed in GoDial. Configure the webhook URL in GoDial under Integrations → Web Hook, select the call event, and paste the provided webhook URL.'
})
  .input(
    z.object({
      eventPayload: z.any().describe('Raw call event payload from GoDial')
    })
  )
  .output(
    z.object({
      contactId: z.string().optional().describe('ID of the contact that was called'),
      contactName: z.string().optional().describe('Name of the contact'),
      phone: z.string().optional().describe('Phone number that was called'),
      duration: z.any().optional().describe('Duration of the call'),
      disposition: z.string().optional().describe('Call disposition or outcome'),
      agentName: z.string().optional().describe('Name of the agent who made the call'),
      listId: z.string().optional().describe('ID of the list the contact belongs to'),
      callDetails: z.any().describe('Full call event data from GoDial')
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
      let uniqueId = payload.callId || payload.eventId || `${contactId}-${Date.now()}`;

      return {
        type: 'call.completed',
        id: String(uniqueId),
        output: {
          contactId: payload.contactId || payload.id || payload._id,
          contactName: payload.name || payload.contactName,
          phone: payload.phone || payload.number,
          duration: payload.duration || payload.callDuration,
          disposition: payload.disposition || payload.status || payload.callStatus,
          agentName: payload.agentName || payload.agent,
          listId: payload.listId,
          callDetails: payload
        }
      };
    }
  })
  .build();
