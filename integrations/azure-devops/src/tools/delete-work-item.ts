import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let deleteWorkItemTool = SlateTool.create(spec, {
  name: 'Delete Work Item',
  key: 'delete_work_item',
  description: `Delete a work item by moving it to the recycle bin, or permanently destroy it. Use with caution — permanent deletion cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      workItemId: z.number().describe('ID of the work item to delete'),
      permanent: z
        .boolean()
        .optional()
        .describe('Permanently destroy the work item instead of moving to recycle bin')
    })
  )
  .output(
    z.object({
      workItemId: z.number(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    await client.deleteWorkItem(project, ctx.input.workItemId, ctx.input.permanent);

    return {
      output: {
        workItemId: ctx.input.workItemId,
        deleted: true
      },
      message: ctx.input.permanent
        ? `Permanently deleted work item **#${ctx.input.workItemId}**`
        : `Moved work item **#${ctx.input.workItemId}** to recycle bin`
    };
  })
  .build();
