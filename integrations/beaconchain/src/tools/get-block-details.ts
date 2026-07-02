import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getBlockDetails = SlateTool.create(spec, {
  name: 'Get Block Details',
  key: 'get_block_details',
  description: `Retrieve execution layer block details including block number, timestamp, gas usage, transaction count, and optionally block rewards (transaction fees and MEV).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      blockNumber: z.number().describe('Execution layer block number'),
      includeRewards: z
        .boolean()
        .optional()
        .describe('Include block rewards data (transaction fees and MEV)')
    })
  )
  .output(
    z.object({
      blockOverview: z.any().describe('Execution layer block details'),
      blockRewards: z
        .any()
        .optional()
        .describe('Block rewards including transaction fees and MEV')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let blockOverview = await client.getBlockOverview(ctx.input.blockNumber);
    let result: Record<string, any> = { blockOverview };

    if (ctx.input.includeRewards) {
      result.blockRewards = await client.getBlockRewards(ctx.input.blockNumber);
    }

    return {
      output: result as any,
      message: `Retrieved details for block **#${ctx.input.blockNumber}** on ${ctx.config.chain}.`
    };
  })
  .build();
