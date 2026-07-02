import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { normalizeAdf } from '../lib/adf';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new Jira issue in a specified project. Supports setting all standard fields including summary, description, assignee, priority, labels, components, and custom fields. Use the **issueTypeName** field for common types like "Task", "Bug", "Story", "Epic", or "Sub-task".`,
  instructions: [
    'Pass rich text descriptions as an Atlassian Document Format (ADF) object. Stringified ADF JSON is accepted as a fallback, and plain text strings are converted to an ADF paragraph.',
    'Custom fields can be set via the customFields parameter using their field IDs (e.g., "customfield_10001").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectKey: z
        .string()
        .describe('The project key (e.g., "PROJ") where the issue will be created.'),
      issueTypeName: z
        .string()
        .describe('The issue type name (e.g., "Task", "Bug", "Story", "Epic", "Sub-task").'),
      summary: z.string().describe('The issue summary/title.'),
      description: z
        .any()
        .optional()
        .describe(
          'The issue description as an Atlassian Document Format (ADF) object, stringified ADF JSON, or a plain text string.'
        ),
      assigneeAccountId: z
        .string()
        .optional()
        .describe('Account ID of the user to assign the issue to.'),
      priorityName: z
        .string()
        .optional()
        .describe('Priority name (e.g., "High", "Medium", "Low").'),
      labels: z.array(z.string()).optional().describe('Labels to apply to the issue.'),
      components: z
        .array(z.string())
        .optional()
        .describe('Component names to associate with the issue.'),
      parentKey: z
        .string()
        .optional()
        .describe('Parent issue key for sub-tasks or children of epics.'),
      fixVersions: z
        .array(z.string())
        .optional()
        .describe('Version names to set as fix versions.'),
      dueDate: z.string().optional().describe('Due date in YYYY-MM-DD format.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Custom field values keyed by field ID (e.g., {"customfield_10001": "value"}).'
        )
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('The ID of the created issue.'),
      issueKey: z.string().describe('The key of the created issue (e.g., "PROJ-123").'),
      issueUrl: z.string().describe('The self URL of the created issue.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let fields: Record<string, any> = {
      project: { key: ctx.input.projectKey },
      issuetype: { name: ctx.input.issueTypeName },
      summary: ctx.input.summary
    };

    if (ctx.input.description) {
      fields.description = normalizeAdf(ctx.input.description);
    }

    if (ctx.input.assigneeAccountId) {
      fields.assignee = { accountId: ctx.input.assigneeAccountId };
    }

    if (ctx.input.priorityName) {
      fields.priority = { name: ctx.input.priorityName };
    }

    if (ctx.input.labels) {
      fields.labels = ctx.input.labels;
    }

    if (ctx.input.components) {
      fields.components = ctx.input.components.map(name => ({ name }));
    }

    if (ctx.input.parentKey) {
      fields.parent = { key: ctx.input.parentKey };
    }

    if (ctx.input.fixVersions) {
      fields.fixVersions = ctx.input.fixVersions.map(name => ({ name }));
    }

    if (ctx.input.dueDate) {
      fields.duedate = ctx.input.dueDate;
    }

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        fields[key] = value;
      }
    }

    let result = await client.createIssue(fields);

    return {
      output: {
        issueId: result.id,
        issueKey: result.key,
        issueUrl: result.self
      },
      message: `Created issue **${result.key}** in project ${ctx.input.projectKey}.`
    };
  })
  .build();
