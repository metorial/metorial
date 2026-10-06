import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export const cancelRegulation = SlateTool.create(spec, {
  name: 'Cancel Regulation',
  key: 'cancel_regulation',
  description:
    'Cancel a user suppression regulation by its ID. Cancellation changes future suppression behavior and cannot restore destination data that was already deleted. The historical regulation record remains.',
  constraints: [
    'Requires access to the User Suppression API; verify downstream deletion fulfillment separately.'
  ],
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      regulationId: z.string().describe('Exact regulation ID from List Regulations.')
    })
  )
  .output(
    z.object({
      regulationId: z.string().describe('Requested regulation ID.'),
      canceled: z
        .boolean()
        .describe(
          'Whether RudderStack accepted cancellation; read the regulation to confirm its state.'
        )
    })
  )
  .handleInvocation(async ctx => {
    await new ControlPlaneClient({
      token: ctx.auth.token,
      region: ctx.config.region
    }).deleteRegulation(ctx.input.regulationId);
    return {
      output: { regulationId: ctx.input.regulationId, canceled: true },
      message: 'RudderStack accepted cancellation. Deleted destination data is not restored.'
    };
  })
  .build();
