import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getEpochInfo = SlateTool.create(spec, {
  key: 'get_epoch_info',
  name: 'Get Epoch Info',
  description:
    'Retrieve a consensus epoch overview, including validator balances, participation, proposals, and slot range. Query an explicit epoch or the latest/finalized view.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      epoch: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Epoch number. Takes precedence over view.'),
      view: z
        .enum(['latest', 'finalized'])
        .optional()
        .describe('Chain view when epoch is omitted. Defaults to latest.')
    })
  )
  .output(z.object({ epoch: z.any().describe('Complete epoch overview response') }))
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({ token: ctx.auth.token, chain: ctx.config.chain });
    let epoch = await client.getEpochOverview(ctx.input.epoch, ctx.input.view);
    return {
      output: { epoch },
      message: `Retrieved an epoch overview on ${ctx.config.chain}.`
    };
  })
  .build();
