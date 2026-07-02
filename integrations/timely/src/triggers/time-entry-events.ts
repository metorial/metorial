import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

let timeEntryEventTypes = ['hours:created', 'hours:updated', 'hours:deleted'] as const;

export let timeEntryEvents = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description: 'Triggers when time entries are created, updated, or deleted in Timely.'
})
  .input(
    z.object({
      eventType: z.string().describe('Webhook event type'),
      rawPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      eventId: z.number().describe('Time entry ID'),
      day: z.string().nullable().describe('Date of the entry'),
      note: z.string().nullable().describe('Entry notes'),
      durationFormatted: z.string().nullable().describe('Formatted duration'),
      totalHours: z.number().nullable().describe('Total hours logged'),
      projectId: z.number().nullable().describe('Associated project ID'),
      projectName: z.string().nullable().describe('Associated project name'),
      userId: z.number().nullable().describe('User who logged the entry'),
      userName: z.string().nullable().describe('User name'),
      billed: z.boolean().nullable().describe('Whether the entry is billed'),
      billable: z.boolean().nullable().describe('Whether the entry is billable'),
      labelIds: z.array(z.number()).describe('Label IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        eventTypes: [...timeEntryEventTypes]
      });

      return {
        registrationDetails: { webhookId: String(webhook.id) }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new TimelyClient({
        accountId: ctx.config.accountId,
        token: ctx.auth.token
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event ?? data.event_type ?? 'hours:updated',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let entry = payload.data ?? payload;

      let eventType = ctx.input.eventType;
      let typeMap: Record<string, string> = {
        'hours:created': 'time_entry.created',
        'hours:updated': 'time_entry.updated',
        'hours:deleted': 'time_entry.deleted'
      };

      return {
        type: typeMap[eventType] ?? 'time_entry.updated',
        id: `hours-${entry.id ?? 'unknown'}-${eventType}`,
        output: {
          eventId: entry.id ?? 0,
          day: entry.day ?? null,
          note: entry.note ?? null,
          durationFormatted: entry.duration?.formatted ?? null,
          totalHours: entry.duration?.total_hours ?? null,
          projectId: entry.project?.id ?? entry.project_id ?? null,
          projectName: entry.project?.name ?? null,
          userId: entry.user?.id ?? entry.user_id ?? null,
          userName: entry.user?.name ?? null,
          billed: entry.billed ?? null,
          billable: entry.billable ?? null,
          labelIds: entry.label_ids ?? []
        }
      };
    }
  })
  .build();
