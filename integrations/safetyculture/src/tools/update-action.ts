import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAction = SlateTool.create(spec, {
  name: 'Update Action',
  key: 'update_action',
  description: `Update an existing corrective action. Modify its title, description, status, priority, due date, assignees, or site. Only provided fields will be updated.`
})
  .input(
    z.object({
      actionId: z.string().describe('ID of the action to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status (e.g., "IN PROGRESS", "DONE")'),
      priority: z
        .string()
        .optional()
        .describe('New priority (e.g., "NONE", "LOW", "MEDIUM", "HIGH")'),
      dueAt: z.string().optional().describe('New due date in ISO 8601 format'),
      assigneeIds: z
        .array(z.string())
        .optional()
        .describe('New list of assigned user IDs (replaces existing)'),
      siteId: z.string().optional().describe('New site ID to associate with')
    })
  )
  .output(
    z.object({
      actionId: z.string().describe('ID of the updated action'),
      updatedFields: z.array(z.string()).describe('List of fields that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { actionId } = ctx.input;
    let updatedFields: string[] = [];

    if (ctx.input.title !== undefined) {
      await client.updateActionTitle(actionId, ctx.input.title);
      updatedFields.push('title');
    }
    if (ctx.input.description !== undefined) {
      await client.updateActionDescription(actionId, ctx.input.description);
      updatedFields.push('description');
    }
    if (ctx.input.status !== undefined) {
      await client.updateActionStatus(actionId, ctx.input.status);
      updatedFields.push('status');
    }
    if (ctx.input.priority !== undefined) {
      await client.updateActionPriority(actionId, ctx.input.priority);
      updatedFields.push('priority');
    }
    if (ctx.input.dueAt !== undefined) {
      await client.updateActionDueDate(actionId, ctx.input.dueAt);
      updatedFields.push('dueAt');
    }
    if (ctx.input.assigneeIds !== undefined) {
      await client.updateActionAssignees(actionId, ctx.input.assigneeIds);
      updatedFields.push('assignees');
    }
    if (ctx.input.siteId !== undefined) {
      await client.updateActionSite(actionId, ctx.input.siteId);
      updatedFields.push('site');
    }

    return {
      output: { actionId, updatedFields },
      message: `Updated action **${actionId}**: modified ${updatedFields.join(', ')}.`
    };
  })
  .build();
