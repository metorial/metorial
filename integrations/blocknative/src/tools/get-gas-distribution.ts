import { SlateTool } from 'slates';
import { z } from 'zod';
import { BlocknativeClient } from '../lib/client';
import { spec } from '../spec';

export let getGasDistribution = SlateTool.create(spec, {
  name: 'Get Gas Distribution',
  key: 'get_gas_distribution',
  description: `Retrieves the current distribution and breakdown of gas prices in the Ethereum mempool. Shows the gas prices of the top N transactions eligible for inclusion in the next block. Useful for understanding current mempool pressure and transaction pricing dynamics.`,
  constraints: ['Only available for Ethereum mainnet.', 'A valid API key is required.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      system: z.string().describe('Blockchain ecosystem ("ethereum")'),
      network: z.string().describe('Network name ("main")'),
      unit: z.string().describe('Price unit ("gwei")'),
      maxPrice: z.number().describe('Highest priced transaction in the mempool'),
      currentBlockNumber: z.number().describe('Block number at time of snapshot'),
      msSinceLastBlock: z.number().describe('Milliseconds since last block'),
      topNDistribution: z
        .object({
          distribution: z
            .array(z.array(z.number()))
            .describe('Array of [gasPrice, count] pairs showing the gas price distribution'),
          n: z.number().describe('Number of transactions included in the distribution')
        })
        .describe('Distribution of gas prices in the mempool')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BlocknativeClient({ token: ctx.auth.token });

    let result = await client.getGasDistribution();

    let bucketCount = result.topNDistribution?.distribution?.length ?? 0;

    return {
      output: result,
      message: `Gas distribution for Ethereum at block ${result.currentBlockNumber}: **${result.topNDistribution.n}** transactions across **${bucketCount}** price buckets. Max price: **${result.maxPrice} ${result.unit}**.`
    };
  })
  .build();
