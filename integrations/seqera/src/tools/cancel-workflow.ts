import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let cancelWorkflow = SlateTool.create(spec, {
  name: 'Cancel Workflow',
  key: 'cancel_workflow',
  description: `Cancel an active workflow run. Only running or submitted workflows can be cancelled.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      workflowId: z.string().describe('The workflow run ID to cancel')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('The cancelled workflow run ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    await client.cancelWorkflow(ctx.input.workflowId);

    return {
      output: {
        workflowId: ctx.input.workflowId
      },
      message: `Workflow **${ctx.input.workflowId}** has been cancelled.`
    };
  })
  .build();
