import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = ['worklog_created', 'worklog_updated', 'worklog_deleted'] as const;

export let worklogEventsTrigger = SlateTrigger.create(spec, {
  name: 'Worklog Events',
  key: 'worklog_events',
  description: 'Triggers when a worklog entry is created, updated, or deleted on a Jira issue.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      worklogId: z.string().describe('The worklog ID.'),
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      timeSpent: z.string().optional().describe('Time spent (formatted).'),
      timeSpentSeconds: z.number().optional().describe('Time spent in seconds.'),
      authorAccountId: z.string().optional().describe('Worklog author account ID.'),
      authorDisplayName: z.string().optional().describe('Worklog author display name.'),
      started: z.string().optional().describe('When the work started.'),
      created: z.string().optional().describe('Worklog creation timestamp.'),
      updated: z.string().optional().describe('Worklog update timestamp.')
    })
  )
  .output(
    z.object({
      worklogId: z.string().describe('The worklog ID.'),
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      timeSpent: z.string().optional().describe('Time spent (formatted).'),
      timeSpentSeconds: z.number().optional().describe('Time spent in seconds.'),
      authorAccountId: z.string().optional().describe('Worklog author account ID.'),
      authorDisplayName: z.string().optional().describe('Worklog author display name.'),
      started: z.string().optional().describe('When the work started.'),
      created: z.string().optional().describe('Worklog creation timestamp.'),
      updated: z.string().optional().describe('Worklog update timestamp.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [...webhookEvents]);

      let webhookIds = (result.webhookRegistrationResult ?? [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId,
        refreshToken: ctx.auth.refreshToken
      });

      let webhookIds = ctx.input.registrationDetails?.webhookIds ?? [];
      if (webhookIds.length > 0) {
        await client.deleteWebhook(webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let worklog = data.worklog ?? {};
      let issue = data.issue ?? {};

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent ?? '',
            timestamp: data.timestamp,
            worklogId: String(worklog.id ?? ''),
            issueId: String(issue.id ?? ''),
            issueKey: issue.key ?? '',
            timeSpent: worklog.timeSpent,
            timeSpentSeconds: worklog.timeSpentSeconds,
            authorAccountId: worklog.author?.accountId,
            authorDisplayName: worklog.author?.displayName,
            started: worklog.started,
            created: worklog.created,
            updated: worklog.updated
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let eventType = 'worklog.updated';
      if (eventName === 'worklog_created') eventType = 'worklog.created';
      else if (eventName === 'worklog_deleted') eventType = 'worklog.deleted';

      return {
        type: eventType,
        id: `worklog-${ctx.input.worklogId}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          worklogId: ctx.input.worklogId,
          issueId: ctx.input.issueId,
          issueKey: ctx.input.issueKey,
          timeSpent: ctx.input.timeSpent,
          timeSpentSeconds: ctx.input.timeSpentSeconds,
          authorAccountId: ctx.input.authorAccountId,
          authorDisplayName: ctx.input.authorDisplayName,
          started: ctx.input.started,
          created: ctx.input.created,
          updated: ctx.input.updated
        }
      };
    }
  })
  .build();
