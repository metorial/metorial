import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let issueEventsTrigger = SlateTrigger.create(spec, {
  name: 'Issue Events',
  key: 'issue_events',
  description:
    'Triggers when issues (including service requests) are created, updated, or deleted. Includes changelog for updates.'
})
  .input(
    z.object({
      webhookEvent: z.string().describe('The webhook event type'),
      timestamp: z.number().optional().describe('Event timestamp'),
      issueId: z.string().describe('Issue ID'),
      issueKey: z.string().describe('Issue key'),
      summary: z.string().optional().describe('Issue summary'),
      status: z.string().optional().describe('Issue status'),
      issueType: z.string().optional().describe('Issue type'),
      priority: z.string().optional().describe('Issue priority'),
      assigneeAccountId: z.string().optional().describe('Assignee account ID'),
      assigneeName: z.string().optional().describe('Assignee display name'),
      reporterAccountId: z.string().optional().describe('Reporter account ID'),
      reporterName: z.string().optional().describe('Reporter display name'),
      projectKey: z.string().optional().describe('Project key'),
      projectName: z.string().optional().describe('Project name'),
      changedFields: z
        .array(
          z.object({
            field: z.string(),
            fromString: z.string().optional(),
            toString: z.string().optional()
          })
        )
        .optional()
        .describe('Changed fields (for updates)'),
      userAccountId: z
        .string()
        .optional()
        .describe('Account ID of the user who triggered the event'),
      userName: z
        .string()
        .optional()
        .describe('Display name of the user who triggered the event')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Issue ID'),
      issueKey: z.string().describe('Issue key'),
      summary: z.string().optional().describe('Issue summary'),
      status: z.string().optional().describe('Issue status'),
      issueType: z.string().optional().describe('Issue type'),
      priority: z.string().optional().describe('Issue priority'),
      assigneeAccountId: z.string().optional().describe('Assignee account ID'),
      assigneeName: z.string().optional().describe('Assignee display name'),
      reporterAccountId: z.string().optional().describe('Reporter account ID'),
      reporterName: z.string().optional().describe('Reporter display name'),
      projectKey: z.string().optional().describe('Project key'),
      projectName: z.string().optional().describe('Project name'),
      changedFields: z
        .array(
          z.object({
            field: z.string(),
            fromString: z.string().optional(),
            toString: z.string().optional()
          })
        )
        .optional()
        .describe('Changed fields (for updates)'),
      userAccountId: z
        .string()
        .optional()
        .describe('Account ID of the user who triggered the event'),
      userName: z
        .string()
        .optional()
        .describe('Display name of the user who triggered the event')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      let result = await client.registerWebhook(ctx.input.webhookBaseUrl, [
        'jira:issue_created',
        'jira:issue_updated',
        'jira:issue_deleted'
      ]);

      let webhookIds = (result.webhookRegistrationResult || [])
        .filter((r: any) => r.createdWebhookId)
        .map((r: any) => r.createdWebhookId);

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new JiraClient({
        token: ctx.auth.token,
        cloudId: ctx.auth.cloudId
      });

      if (ctx.input.registrationDetails?.webhookIds?.length) {
        await client.deleteWebhook(ctx.input.registrationDetails.webhookIds);
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let issue = data.issue || {};
      let fields = issue.fields || {};
      let changelog = data.changelog;

      let changedFields: any[] | undefined;
      if (changelog?.items) {
        changedFields = changelog.items.map((item: any) => ({
          field: item.field,
          fromString: item.fromString,
          toString: item.toString
        }));
      }

      return {
        inputs: [
          {
            webhookEvent: data.webhookEvent || data.issue_event_type_name || 'unknown',
            timestamp: data.timestamp,
            issueId: issue.id,
            issueKey: issue.key,
            summary: fields.summary,
            status: fields.status?.name,
            issueType: fields.issuetype?.name,
            priority: fields.priority?.name,
            assigneeAccountId: fields.assignee?.accountId,
            assigneeName: fields.assignee?.displayName,
            reporterAccountId: fields.reporter?.accountId,
            reporterName: fields.reporter?.displayName,
            projectKey: fields.project?.key,
            projectName: fields.project?.name,
            changedFields,
            userAccountId: data.user?.accountId,
            userName: data.user?.displayName
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = 'issue.updated';
      if (ctx.input.webhookEvent.includes('created')) {
        eventType = 'issue.created';
      } else if (ctx.input.webhookEvent.includes('deleted')) {
        eventType = 'issue.deleted';
      }

      return {
        type: eventType,
        id: `${ctx.input.issueId}-${ctx.input.timestamp || Date.now()}`,
        output: {
          issueId: ctx.input.issueId,
          issueKey: ctx.input.issueKey,
          summary: ctx.input.summary,
          status: ctx.input.status,
          issueType: ctx.input.issueType,
          priority: ctx.input.priority,
          assigneeAccountId: ctx.input.assigneeAccountId,
          assigneeName: ctx.input.assigneeName,
          reporterAccountId: ctx.input.reporterAccountId,
          reporterName: ctx.input.reporterName,
          projectKey: ctx.input.projectKey,
          projectName: ctx.input.projectName,
          changedFields: ctx.input.changedFields,
          userAccountId: ctx.input.userAccountId,
          userName: ctx.input.userName
        }
      };
    }
  })
  .build();
