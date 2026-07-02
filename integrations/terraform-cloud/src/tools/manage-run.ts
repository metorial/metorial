import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageRunTool = SlateTool.create(spec, {
  name: 'Manage Run',
  key: 'manage_run',
  description: `Perform an action on an existing Terraform run. Apply a planned run, discard an unapplied plan, cancel a running operation, force-cancel a stuck run, or force-execute a run that is waiting in the queue.`,
  instructions: [
    'Use "apply" to confirm and apply a planned run.',
    'Use "discard" to discard a plan without applying.',
    'Use "cancel" to cancel an in-progress run gracefully.',
    'Use "force_cancel" to forcefully terminate a stuck run.',
    'Use "force_execute" to skip the queue and run immediately.'
  ]
})
  .input(
    z.object({
      runId: z.string().describe('The run ID to perform the action on'),
      action: z
        .enum(['apply', 'discard', 'cancel', 'force_cancel', 'force_execute'])
        .describe('The action to perform on the run'),
      comment: z.string().optional().describe('Optional comment explaining the action')
    })
  )
  .output(
    z.object({
      runId: z.string(),
      action: z.string(),
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'apply':
        await client.applyRun(ctx.input.runId, ctx.input.comment);
        break;
      case 'discard':
        await client.discardRun(ctx.input.runId, ctx.input.comment);
        break;
      case 'cancel':
        await client.cancelRun(ctx.input.runId, ctx.input.comment);
        break;
      case 'force_cancel':
        await client.forceCancelRun(ctx.input.runId, ctx.input.comment);
        break;
      case 'force_execute':
        await client.forceExecuteRun(ctx.input.runId);
        break;
    }

    return {
      output: {
        runId: ctx.input.runId,
        action: ctx.input.action,
        success: true
      },
      message: `Successfully performed **${ctx.input.action}** on run ${ctx.input.runId}.`
    };
  })
  .build();
