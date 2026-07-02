import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let timeEntryEvents = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description:
    'Triggers when a time entry is created, updated, or deleted in Hub Planner. Requires the Timesheets extension.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'The webhook event type (e.g. timeEntry.create, timeEntry.update, timeEntry.delete)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      timeEntryId: z.string().describe('Time entry ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      date: z.string().optional().describe('Time entry date'),
      minutes: z.number().optional().describe('Duration in minutes'),
      status: z.string().optional().describe('Time entry status'),
      note: z.string().optional().describe('Time entry note')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string().describe('Time entry ID'),
      resourceId: z.string().optional().describe('Resource ID'),
      projectId: z.string().optional().describe('Project ID'),
      date: z.string().optional().describe('Date'),
      minutes: z.number().optional().describe('Duration in minutes'),
      status: z.string().optional().describe('Status'),
      note: z.string().optional().describe('Note')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let events = ['timeEntry.create', 'timeEntry.update', 'timeEntry.delete'];
      let registrations: Array<{ subscriptionId: string; event: string }> = [];

      for (let event of events) {
        let result = await client.createWebhook({
          event,
          target_url: ctx.input.webhookBaseUrl
        });
        registrations.push({ subscriptionId: result._id, event });
      }

      return { registrationDetails: { subscriptions: registrations } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let subscriptions = ctx.input.registrationDetails?.subscriptions || [];
      for (let sub of subscriptions) {
        await client.deleteWebhook(sub.subscriptionId);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.event || '';
      let timeEntryId = data.timeEntryId || data._id || '';
      let eventId = `${eventType}-${timeEntryId}-${data.updatedDate || Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            timeEntryId,
            resourceId: data.resourceId,
            projectId: data.projectId,
            date: data.date,
            minutes: data.minutes,
            status: data.status,
            note: data.note
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          timeEntryId: ctx.input.timeEntryId,
          resourceId: ctx.input.resourceId,
          projectId: ctx.input.projectId,
          date: ctx.input.date,
          minutes: ctx.input.minutes,
          status: ctx.input.status,
          note: ctx.input.note
        }
      };
    }
  })
  .build();
