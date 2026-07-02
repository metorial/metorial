import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteWorkflow = SlateTool.create(spec, {
  name: 'Delete Workflow',
  key: 'delete_workflow',
  description: `Permanently delete a workflow from n8n. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('ID of the workflow to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    await client.deleteWorkflow(ctx.input.workflowId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted workflow **${ctx.input.workflowId}**.`
    };
  })
  .build();
