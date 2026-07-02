import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let timeEntryEvents = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description: 'Triggers when a time entry is created, updated, or deleted in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of time entry event'),
      timeEntryId: z.string().describe('ID of the affected time entry'),
      projectId: z.string().optional().describe('Project ID'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('ID of the affected time entry'),
      projectId: z.string().optional().describe('Project ID'),
      taskId: z.string().optional().describe('Task ID'),
      personId: z.string().optional().describe('Person who logged time'),
      personName: z.string().optional().describe('Name of the person'),
      date: z.string().optional().describe('Date of the time entry'),
      hours: z.string().optional().describe('Hours logged'),
      minutes: z.string().optional().describe('Minutes logged'),
      description: z.string().optional().describe('Work description'),
      isBillable: z.boolean().optional().describe('Whether the entry is billable'),
      updatedBy: z.string().optional().describe('ID of the user who triggered the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event || data;
      let timeEntry = event.timeEntry || event['time-entry'] || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let timeEntryId = timeEntry.id
        ? String(timeEntry.id)
        : event.objectId
          ? String(event.objectId)
          : '';

      if (!timeEntryId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            timeEntryId,
            projectId: timeEntry.projectId
              ? String(timeEntry.projectId)
              : timeEntry['project-id']
                ? String(timeEntry['project-id'])
                : undefined,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let te = event?.timeEntry || event?.['time-entry'] || event?.objectData || {};
      let user = event?.user || event?.eventCreator || {};

      return {
        type: `time_entry.${ctx.input.eventType
          .replace(/^TIME_ENTRY\./, '')
          .replace(/^TIMEENTRY\./, '')
          .toLowerCase()}`,
        id: `time-entry-${ctx.input.timeEntryId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          timeEntryId: ctx.input.timeEntryId,
          projectId: ctx.input.projectId || undefined,
          taskId: te['todo-item-id']
            ? String(te['todo-item-id'])
            : te.taskId
              ? String(te.taskId)
              : undefined,
          personId: te['person-id']
            ? String(te['person-id'])
            : te.personId
              ? String(te.personId)
              : undefined,
          personName: te['person-first-name']
            ? `${te['person-first-name']} ${te['person-last-name'] || ''}`.trim()
            : undefined,
          date: te.date || undefined,
          hours: te.hours != null ? String(te.hours) : undefined,
          minutes: te.minutes != null ? String(te.minutes) : undefined,
          description: te.description || undefined,
          isBillable:
            te.isbillable === '1' ||
            te.isbillable === true ||
            te.isBillable === true ||
            undefined,
          updatedBy: user.id ? String(user.id) : undefined
        }
      };
    }
  })
  .build();
