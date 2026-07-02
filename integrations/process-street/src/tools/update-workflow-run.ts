import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateWorkflowRun = SlateTool.create(spec, {
  name: 'Update Workflow Run',
  key: 'update_workflow_run',
  description: `Update a workflow run's name, status, due date, or share link setting. Can be used to complete, archive, or reactivate a workflow run. The API requires all fields to be sent, so the tool first fetches current values and merges your changes.`,
  instructions: [
    'Set status to "Completed" to mark the run as done, "Archived" to archive it, or "Active" to reactivate.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run to update'),
      name: z.string().optional().describe('New name for the workflow run'),
      status: z.enum(['Active', 'Completed', 'Archived']).optional().describe('New status'),
      shared: z.boolean().optional().describe('Whether to enable the share link'),
      dueDate: z
        .string()
        .optional()
        .describe('New due date in ISO 8601 format, or empty string to clear')
    })
  )
  .output(
    z.object({
      workflowRunId: z.string().describe('ID of the updated workflow run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let current = await client.getWorkflowRun(ctx.input.workflowRunId);

    let updateData = {
      name: ctx.input.name ?? current.name ?? '',
      status: ctx.input.status ?? current.status,
      shared: ctx.input.shared ?? current.shared,
      dueDate: ctx.input.dueDate === '' ? null : (ctx.input.dueDate ?? current.dueDate ?? null)
    };

    await client.updateWorkflowRun(ctx.input.workflowRunId, updateData);

    return {
      output: { workflowRunId: ctx.input.workflowRunId },
      message: `Updated workflow run **${updateData.name || ctx.input.workflowRunId}**.`
    };
  })
  .build();
