import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteWorkflowRun = SlateTool.create(spec, {
  name: 'Delete Workflow Run',
  key: 'delete_workflow_run',
  description: `Delete or restore a workflow run. Deleted runs can be restored using the restore option.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workflowRunId: z.string().describe('ID of the workflow run to delete or restore'),
      restore: z
        .boolean()
        .optional()
        .describe(
          'Set to true to restore a previously deleted workflow run instead of deleting'
        )
    })
  )
  .output(
    z.object({
      workflowRunId: z.string().describe('ID of the affected workflow run'),
      action: z.string().describe('Action performed: "deleted" or "restored"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.restore) {
      await client.undeleteWorkflowRun(ctx.input.workflowRunId);
      return {
        output: { workflowRunId: ctx.input.workflowRunId, action: 'restored' },
        message: `Restored workflow run **${ctx.input.workflowRunId}**.`
      };
    }

    await client.deleteWorkflowRun(ctx.input.workflowRunId);
    return {
      output: { workflowRunId: ctx.input.workflowRunId, action: 'deleted' },
      message: `Deleted workflow run **${ctx.input.workflowRunId}**.`
    };
  })
  .build();
