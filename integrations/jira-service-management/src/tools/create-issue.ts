import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let createIssueTool = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new Jira issue in a specified project. Supports setting summary, description, issue type, priority, assignee, labels, components, and custom fields.`,
  instructions: [
    'The projectKey and summary are always required.',
    'issueType defaults to "Task" if not specified; common types include "Task", "Bug", "Story", "Epic".',
    'For custom fields, use the customFields object with field IDs as keys.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectKey: z.string().describe('Project key where the issue will be created'),
      summary: z.string().describe('Issue summary/title'),
      issueType: z
        .string()
        .optional()
        .describe('Issue type name (e.g., "Task", "Bug", "Story"). Defaults to "Task".'),
      description: z.string().optional().describe('Plain text description of the issue'),
      priority: z
        .string()
        .optional()
        .describe('Priority name (e.g., "High", "Medium", "Low")'),
      assigneeAccountId: z.string().optional().describe('Account ID of the user to assign'),
      labels: z.array(z.string()).optional().describe('Labels to apply'),
      components: z.array(z.string()).optional().describe('Component names to associate'),
      parentKey: z
        .string()
        .optional()
        .describe('Parent issue key for subtasks or child issues'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as a map of field ID to value')
    })
  )
  .output(
    z.object({
      issueId: z.string().describe('Unique ID of the created issue'),
      issueKey: z.string().describe('Human-readable issue key'),
      selfUrl: z.string().describe('REST API URL of the created issue')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let fields: any = {
      project: { key: ctx.input.projectKey },
      summary: ctx.input.summary,
      issuetype: { name: ctx.input.issueType || 'Task' }
    };

    if (ctx.input.description) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: ctx.input.description }] }
        ]
      };
    }

    if (ctx.input.priority) {
      fields.priority = { name: ctx.input.priority };
    }

    if (ctx.input.assigneeAccountId) {
      fields.assignee = { accountId: ctx.input.assigneeAccountId };
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

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        fields[key] = value;
      }
    }

    let result = await client.createIssue({ fields });

    return {
      output: {
        issueId: result.id,
        issueKey: result.key,
        selfUrl: result.self
      },
      message: `Created issue **${result.key}** in project ${ctx.input.projectKey}.`
    };
  })
  .build();
