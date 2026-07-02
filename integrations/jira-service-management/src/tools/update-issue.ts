import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let updateIssueTool = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing Jira issue's fields. Supports changing summary, description, priority, labels, components, assignee, and custom fields. Can also transition the issue to a new status or assign/unassign it.`,
  instructions: [
    'To unassign an issue, set assigneeAccountId to null.',
    'To transition an issue, provide either transitionId or transitionName. Use the Get Issue tool with includeTransitions to discover available transitions.',
    'Only fields that are provided will be updated; omitted fields remain unchanged.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Issue key (e.g., PROJ-123) or numeric issue ID'),
      summary: z.string().optional().describe('New summary/title'),
      description: z.string().optional().describe('New plain text description'),
      priority: z.string().optional().describe('New priority name'),
      assigneeAccountId: z
        .string()
        .nullable()
        .optional()
        .describe('Account ID to assign, or null to unassign'),
      labels: z.array(z.string()).optional().describe('Replace labels with this list'),
      components: z.array(z.string()).optional().describe('Replace components with this list'),
      transitionId: z
        .string()
        .optional()
        .describe('Transition ID to move the issue to a new status'),
      transitionName: z
        .string()
        .optional()
        .describe('Transition name to move the issue (looked up automatically)'),
      transitionComment: z.string().optional().describe('Comment to add when transitioning'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field values as a map of field ID to value')
    })
  )
  .output(
    z.object({
      issueIdOrKey: z.string().describe('The issue key or ID that was updated'),
      transitioned: z.boolean().describe('Whether a transition was performed'),
      transitionedTo: z
        .string()
        .optional()
        .describe('The status the issue was transitioned to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let fields: any = {};
    let hasFieldUpdates = false;

    if (ctx.input.summary !== undefined) {
      fields.summary = ctx.input.summary;
      hasFieldUpdates = true;
    }

    if (ctx.input.description !== undefined) {
      fields.description = {
        type: 'doc',
        version: 1,
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: ctx.input.description }] }
        ]
      };
      hasFieldUpdates = true;
    }

    if (ctx.input.priority !== undefined) {
      fields.priority = { name: ctx.input.priority };
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

    if (ctx.input.customFields) {
      for (let [key, value] of Object.entries(ctx.input.customFields)) {
        fields[key] = value;
        hasFieldUpdates = true;
      }
    }

    if (ctx.input.assigneeAccountId !== undefined) {
      await client.assignIssue(ctx.input.issueIdOrKey, ctx.input.assigneeAccountId);
    }

    if (hasFieldUpdates) {
      await client.updateIssue(ctx.input.issueIdOrKey, { fields });
    }

    let transitioned = false;
    let transitionedTo: string | undefined;

    if (ctx.input.transitionId || ctx.input.transitionName) {
      let transitionId = ctx.input.transitionId;

      if (!transitionId && ctx.input.transitionName) {
        let transitions = await client.getTransitions(ctx.input.issueIdOrKey);
        let match = transitions.find(
          (t: any) => t.name.toLowerCase() === ctx.input.transitionName!.toLowerCase()
        );
        if (!match) {
          let available = transitions.map((t: any) => t.name).join(', ');
          throw new Error(
            `Transition "${ctx.input.transitionName}" not found. Available transitions: ${available}`
          );
        }
        transitionId = match.id;
        transitionedTo = match.to?.name || match.name;
      }

      if (transitionId) {
        await client.transitionIssue(
          ctx.input.issueIdOrKey,
          transitionId,
          undefined,
          ctx.input.transitionComment
        );
        transitioned = true;

        if (!transitionedTo) {
          let transitions = await client.getTransitions(ctx.input.issueIdOrKey);
          let match = transitions.find((t: any) => t.id === transitionId);
          transitionedTo = match?.to?.name;
        }
      }
    }

    let actions: string[] = [];
    if (hasFieldUpdates) actions.push('updated fields');
    if (ctx.input.assigneeAccountId !== undefined) actions.push('updated assignee');
    if (transitioned) actions.push(`transitioned to "${transitionedTo}"`);

    return {
      output: {
        issueIdOrKey: ctx.input.issueIdOrKey,
        transitioned,
        transitionedTo
      },
      message: `Issue **${ctx.input.issueIdOrKey}**: ${actions.join(', ') || 'no changes made'}.`
    };
  })
  .build();
