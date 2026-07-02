import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let timeEntryEventTypes = [
  'NEW_TIME_ENTRY',
  'NEW_TIMER_STARTED',
  'TIMER_STOPPED',
  'TIME_ENTRY_UPDATED',
  'TIME_ENTRY_DELETED',
  'TIME_ENTRY_SPLIT',
  'TIME_ENTRY_RESTORED'
] as const;

let eventTypeMap: Record<string, string> = {
  NEW_TIME_ENTRY: 'time_entry.created',
  NEW_TIMER_STARTED: 'time_entry.timer_started',
  TIMER_STOPPED: 'time_entry.timer_stopped',
  TIME_ENTRY_UPDATED: 'time_entry.updated',
  TIME_ENTRY_DELETED: 'time_entry.deleted',
  TIME_ENTRY_SPLIT: 'time_entry.split',
  TIME_ENTRY_RESTORED: 'time_entry.restored'
};

export let timeEntryEvents = SlateTrigger.create(spec, {
  name: 'Time Entry Events',
  key: 'time_entry_events',
  description:
    'Triggered when time entries are created, updated, deleted, split, restored, or when timers are started/stopped.'
})
  .input(
    z.object({
      eventType: z.string().describe('Clockify webhook event type'),
      webhookId: z.string().optional().describe('Webhook ID'),
      timeEntry: z.any().describe('Time entry data from webhook payload')
    })
  )
  .output(
    z.object({
      timeEntryId: z.string(),
      description: z.string().optional(),
      projectId: z.string().optional(),
      taskId: z.string().optional(),
      userId: z.string().optional(),
      billable: z.boolean().optional(),
      start: z.string().optional(),
      end: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      workspaceId: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let webhookIds: string[] = [];
      for (let eventType of timeEntryEventTypes) {
        let webhook = await client.createWebhook({
          name: `slates_${eventType}`,
          url: ctx.input.webhookBaseUrl,
          triggerEvent: eventType
        });
        webhookIds.push(webhook.id);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        workspaceId: ctx.config.workspaceId,
        dataRegion: ctx.config.dataRegion
      });

      let details = ctx.input.registrationDetails as { webhookIds: string[] };
      for (let webhookId of details.webhookIds) {
        try {
          await client.deleteWebhook(webhookId);
        } catch (_e) {
          // Ignore errors during cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.triggerEvent || data.eventType || 'UNKNOWN',
            webhookId: data.webhookId || undefined,
            timeEntry: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let entry = ctx.input.timeEntry;
      let timeEntryId = entry.id || entry.timeEntryId || 'unknown';
      let mappedType =
        eventTypeMap[ctx.input.eventType] || `time_entry.${ctx.input.eventType.toLowerCase()}`;

      return {
        type: mappedType,
        id: `${ctx.input.eventType}_${timeEntryId}_${entry.changeDate || Date.now()}`,
        output: {
          timeEntryId,
          description: entry.description || undefined,
          projectId: entry.projectId || undefined,
          taskId: entry.taskId || undefined,
          userId: entry.userId || undefined,
          billable: entry.billable,
          start: entry.timeInterval?.start || undefined,
          end: entry.timeInterval?.end || undefined,
          tagIds: entry.tagIds?.length ? entry.tagIds : undefined,
          workspaceId: entry.workspaceId || undefined
        }
      };
    }
  })
  .build();
