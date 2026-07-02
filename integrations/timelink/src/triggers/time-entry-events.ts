import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let timeEntryEventsTrigger = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description:
    'Triggers when a time entry is created, updated, or deleted in Timelink. Provides the full time entry details for created and updated events.'
})
  .input(
    z.object({
      eventType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of time entry event'),
      eventId: z.string().describe('Unique identifier for this event'),
      timeEntryId: z.number().describe('ID of the affected time entry'),
      start: z.string().optional().describe('Start time of the entry'),
      end: z.string().optional().describe('End time of the entry'),
      description: z.string().optional().describe('Description of the work performed'),
      clientId: z.number().optional().describe('ID of the associated client'),
      projectId: z.number().optional().describe('ID of the associated project'),
      serviceId: z.number().optional().describe('ID of the associated service'),
      userId: z.number().optional().describe('ID of the user'),
      paid: z.boolean().optional().describe('Whether the time entry has been paid'),
      billable: z.boolean().optional().describe('Whether the time entry is billable'),
      externalId: z.string().optional().describe('External ID for syncing')
    })
  )
  .output(
    z.object({
      timeEntryId: z.number().describe('ID of the affected time entry'),
      start: z.string().optional().describe('Start time of the entry (ISO 8601 format)'),
      end: z.string().optional().describe('End time of the entry (ISO 8601 format)'),
      description: z.string().optional().describe('Description of the work performed'),
      clientId: z.number().optional().describe('ID of the associated client'),
      projectId: z.number().optional().describe('ID of the associated project'),
      serviceId: z.number().optional().describe('ID of the associated service'),
      userId: z.number().optional().describe('ID of the user who created/owns the entry'),
      paid: z.boolean().optional().describe('Whether the time entry has been paid'),
      billable: z.boolean().optional().describe('Whether the time entry is billable'),
      externalId: z.string().optional().describe('External ID for syncing with other systems')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Determine event type from webhook payload
      let eventType: 'created' | 'updated' | 'deleted' = 'created';
      if (data.event) {
        if (data.event.includes('update')) eventType = 'updated';
        else if (data.event.includes('delete')) eventType = 'deleted';
        else if (data.event.includes('create')) eventType = 'created';
      }

      let entry = data.data || data.time_entry || data;
      let entryId = entry.id || data.id;

      let eventId = `${eventType}-${entryId}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            timeEntryId: entryId,
            start: entry.start,
            end: entry.end,
            description: entry.description,
            clientId: entry.client_id ?? entry.clientId,
            projectId: entry.project_id ?? entry.projectId,
            serviceId: entry.service_id ?? entry.serviceId,
            userId: entry.user_id ?? entry.userId,
            paid: entry.paid,
            billable: entry.billable,
            externalId: entry.external_id ?? entry.externalId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `time_entry.${ctx.input.eventType}`,
        id: ctx.input.eventId,
        output: {
          timeEntryId: ctx.input.timeEntryId,
          start: ctx.input.start,
          end: ctx.input.end,
          description: ctx.input.description,
          clientId: ctx.input.clientId,
          projectId: ctx.input.projectId,
          serviceId: ctx.input.serviceId,
          userId: ctx.input.userId,
          paid: ctx.input.paid,
          billable: ctx.input.billable,
          externalId: ctx.input.externalId
        }
      };
    }
  })
  .build();
