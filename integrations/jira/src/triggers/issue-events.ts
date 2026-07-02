import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

let webhookEvents = [
  'jira:issue_created',
  'jira:issue_updated',
  'jira:issue_deleted'
] as const;

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when an issue is created, updated, or deleted in Jira. Includes the full issue data and a changelog for update events.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event name.'),
      timestamp: z.number().optional().describe('Event timestamp.'),
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      summary: z.string().optional().describe('The issue summary.'),
      status: z.string().optional().describe('The issue status name.'),
      issueType: z.string().optional().describe('The issue type name.'),
      priority: z.string().optional().describe('The issue priority name.'),
      projectKey: z.string().optional().describe('The project key.'),
      assigneeAccountId: z.string().optional().nullable().describe('Assignee account ID.'),
      assigneeDisplayName: z.string().optional().nullable().describe('Assignee display name.'),
      reporterAccountId: z.string().optional().nullable().describe('Reporter account ID.'),
      reporterDisplayName: z.string().optional().nullable().describe('Reporter display name.'),
      changelog: z
        .array(
          z.object({
            field: z.string(),
            fromString: z.string().optional().nullable(),
            toString: z.string().optional().nullable()
          })
        )
        .optional()
        .describe('List of field changes (for update events).'),
      userAccountId: z
        .string()
        .optional()
        .describe('Account ID of the user who triggered the event.'),
      userDisplayName: z
        .string()
        .optional()
        .describe('Display name of the user who triggered the event.')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('The issue ID.'),
      issueKey: z.string().describe('The issue key.'),
      summary: z.string().optional().describe('The issue summary.'),
      status: z.string().optional().describe('The issue status.'),
      issueType: z.string().optional().describe('The issue type.'),
      priority: z.string().optional().describe('The issue priority.'),
      projectKey: z.string().optional().describe('The project key.'),
      assigneeAccountId: z.string().optional().nullable().describe('Assignee account ID.'),
      assigneeDisplayName: z.string().optional().nullable().describe('Assignee display name.'),
      reporterAccountId: z.string().optional().nullable().describe('Reporter account ID.'),
      reporterDisplayName: z.string().optional().nullable().describe('Reporter display name.'),
      changelog: z
        .array(
          z.object({
            field: z.string(),
            fromString: z.string().optional().nullable(),
            toString: z.string().optional().nullable()
          })
        )
        .optional()
        .describe('Changed fields (for update events).'),
      userAccountId: z.string().optional().describe('The user who triggered the event.'),
      userDisplayName: z.string().optional().describe('Display name of the triggering user.')
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

      let eventName = data.webhookEvent ?? '';
      let issue = data.issue ?? {};
      let fields = issue.fields ?? {};
      let changelog =
        data.changelog?.items?.map((item: any) => ({
          field: item.field,
          fromString: item.fromString,
          toString: item.toString
        })) ?? undefined;

      return {
        inputs: [
          {
            webhookEvent: eventName,
            timestamp: data.timestamp,
            issueId: String(issue.id ?? ''),
            issueKey: issue.key ?? '',
            summary: fields.summary,
            status: fields.status?.name,
            issueType: fields.issuetype?.name,
            priority: fields.priority?.name,
            projectKey: fields.project?.key,
            assigneeAccountId: fields.assignee?.accountId ?? null,
            assigneeDisplayName: fields.assignee?.displayName ?? null,
            reporterAccountId: fields.reporter?.accountId ?? null,
            reporterDisplayName: fields.reporter?.displayName ?? null,
            changelog,
            userAccountId: data.user?.accountId,
            userDisplayName: data.user?.displayName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventName = ctx.input.webhookEvent;
      let eventType = 'issue.updated';
      if (eventName === 'jira:issue_created') eventType = 'issue.created';
      else if (eventName === 'jira:issue_deleted') eventType = 'issue.deleted';

      return {
        type: eventType,
        id: `${ctx.input.issueKey}-${ctx.input.timestamp ?? Date.now()}`,
        output: {
          issueId: ctx.input.issueId,
          issueKey: ctx.input.issueKey,
          summary: ctx.input.summary,
          status: ctx.input.status,
          issueType: ctx.input.issueType,
          priority: ctx.input.priority,
          projectKey: ctx.input.projectKey,
          assigneeAccountId: ctx.input.assigneeAccountId,
          assigneeDisplayName: ctx.input.assigneeDisplayName,
          reporterAccountId: ctx.input.reporterAccountId,
          reporterDisplayName: ctx.input.reporterDisplayName,
          changelog: ctx.input.changelog,
          userAccountId: ctx.input.userAccountId,
          userDisplayName: ctx.input.userDisplayName
        }
      };
    }
  })
  .build();
