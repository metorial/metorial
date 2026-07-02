import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateAgreementState = SlateTool.create(spec, {
  name: 'Update Agreement State',
  key: 'update_agreement_state',
  description: `Cancel or expire an agreement by updating its state. Use this to cancel agreements that are in progress, or to perform other state transitions.`,
  instructions: [
    'To cancel an agreement, set the state to "CANCELLED".',
    'Only agreements in certain states can be transitioned (e.g., you cannot cancel a completed agreement).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      agreementId: z.string().describe('ID of the agreement to update'),
      state: z.enum(['CANCELLED']).describe('Target state for the agreement'),
      cancellationComment: z
        .string()
        .optional()
        .describe('Comment explaining why the agreement is being cancelled'),
      notifyOthers: z
        .boolean()
        .optional()
        .describe(
          'Whether to notify other participants about the cancellation. Defaults to true.'
        )
    })
  )
  .output(
    z.object({
      agreementId: z.string().describe('ID of the updated agreement'),
      state: z.string().describe('New state of the agreement')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    await client.updateAgreementState(ctx.input.agreementId, ctx.input.state, {
      cancellationInfo:
        ctx.input.cancellationComment || ctx.input.notifyOthers !== undefined
          ? {
              comment: ctx.input.cancellationComment,
              notifyOthers: ctx.input.notifyOthers ?? true
            }
          : undefined
    });

    return {
      output: {
        agreementId: ctx.input.agreementId,
        state: ctx.input.state
      },
      message: `Agreement \`${ctx.input.agreementId}\` has been **${ctx.input.state.toLowerCase()}**.`
    };
  });
