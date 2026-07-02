import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { normalizeAdf } from '../lib/adf';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing Jira issue's fields, transition it to a new status, or reassign it. Combines field updates, workflow transitions, and assignment into a single flexible tool. Only provided fields will be updated.`,
  instructions: [
    'To transition an issue, provide the transitionId. Use the Get Transitions tool to find available transition IDs.',
    'Set assigneeAccountId to null to unassign the issue.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('The issue key (e.g., "PROJ-123") or numeric ID.'),
      summary: z.string().optional().describe('Updated summary/title.'),
      description: z
        .any()
        .optional()
        .describe(
          'Updated description as an ADF object, stringified ADF JSON, or a plain text string.'
        ),
      assigneeAccountId: z
        .string()
        .optional()
        .nullable()
        .describe('Account ID to assign to, or null to unassign.'),
      priorityName: z.string().optional().describe('Updated priority name.'),
      labels: z
        .array(z.string())
        .optional()
        .describe('Updated labels (replaces existing labels).'),
      components: z
        .array(z.string())
        .optional()
        .describe('Updated component names (replaces existing).'),
      fixVersions: z.array(z.string()).optional().describe('Updated fix version names.'),
      dueDate: z
        .string()
        .optional()
        .nullable()
        .describe('Updated due date (YYYY-MM-DD) or null to clear.'),
      transitionId: z
        .string()
        .optional()
        .describe('Workflow transition ID to move the issue to a new status.'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values keyed by field ID.')
    })
  )
  .output(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID that was updated.'),
      transitioned: z.boolean().describe('Whether a workflow transition was performed.'),
      updated: z.boolean().describe('Whether field updates were applied.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let fields: Record<string, any> = {};
    let hasFieldUpdates = false;

    if (ctx.input.summary !== undefined) {
      fields.summary = ctx.input.summary;
      hasFieldUpdates = true;
    }

    if (ctx.input.description !== undefined) {
      fields.description = normalizeAdf(ctx.input.description);
      hasFieldUpdates = true;
    }

    if (ctx.input.priorityName !== undefined) {
      fields.priority = { name: ctx.input.priorityName };
      hasFieldUpdates = true;
    }

    if (ctx.input.labels !== undefined) {
      fields.labels = ctx.input.labels;
      hasFieldUpdates = true;
    }

    if (ctx.input.components !== undefined) {
      fields.components = ctx.input.components.map(name => ({ name }));
      hasFieldUpdates = true;
    }

    if (ctx.input.fixVersions !== undefined) {
      fields.fixVersions = ctx.input.fixVersions.map(name => ({ name }));
      hasFieldUpdates = true;
    }

    if (ctx.input.dueDate !== undefined) {
      fields.duedate = ctx.input.dueDate;
      hasFieldUpdates = true;
    }

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        fields[key] = value;
        hasFieldUpdates = true;
      }
    }

    // Handle assignee separately since it uses a different endpoint
    if (ctx.input.assigneeAccountId !== undefined) {
      await client.assignIssue(ctx.input.issueIdOrKey, ctx.input.assigneeAccountId);
    }

    if (hasFieldUpdates) {
      await client.updateIssue(ctx.input.issueIdOrKey, fields);
    }

    let transitioned = false;
    if (ctx.input.transitionId) {
      await client.transitionIssue(ctx.input.issueIdOrKey, ctx.input.transitionId);
      transitioned = true;
    }

    let actions: string[] = [];
    if (hasFieldUpdates) actions.push('fields updated');
    if (ctx.input.assigneeAccountId !== undefined) actions.push('assignee changed');
    if (transitioned) actions.push('transitioned');

    return {
      output: {
        issueIdOrKey: ctx.input.issueIdOrKey,
        transitioned,
        updated: hasFieldUpdates || ctx.input.assigneeAccountId !== undefined
      },
      message: `Updated issue **${ctx.input.issueIdOrKey}**: ${actions.join(', ') || 'no changes applied'}.`
    };
  })
  .build();
