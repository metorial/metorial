import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeveloperClient } from '../lib/client';
import { spec } from '../spec';

export let getPoolsTool = SlateTool.create(spec, {
  name: 'Get Pools',
  key: 'get_pools',
  description: `Retrieve information about mining pools including supported coins, fees, payout thresholds, and reward methods. Filter by payout coin or pool type. Useful for selecting the best mining pool for a given coin or algorithm.`,
  constraints: [
    'Requires a Developer API key from the minerstat Developer Portal',
    'Pool data refreshes roughly once per minute; more frequent calls offer no benefit'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      coin: z.string().optional().describe('Filter by payout coin symbol (e.g. "ETH", "BTC")'),
      poolType: z.string().optional().describe('Filter by pool category (e.g. "multipool")')
    })
  )
  .output(
    z.object({
      pools: z.array(
        z.object({
          poolId: z.string().describe('Unique pool identifier'),
          name: z.string().describe('Pool display name'),
          slug: z.string().describe('URL slug for the pool'),
          description: z.string().describe('Pool overview'),
          website: z.string().describe('Pool website URL'),
          founded: z.string().describe('Year established'),
          poolType: z.string().describe('Pool category'),
          coins: z
            .record(
              z.string(),
              z.object({
                algorithm: z.string(),
                payoutThreshold: z.string(),
                rewardMethod: z.string(),
                fee: z.string(),
                anonymous: z.boolean(),
                registration: z.boolean()
              })
            )
            .describe('Supported coins with mining details')
        })
      ),
      totalCount: z.number().describe('Number of pools returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.developerApiKey) {
      throw new Error(
        'Developer API key is required to query pool data. Please provide it in your authentication credentials.'
      );
    }

    let client = new DeveloperClient({ developerApiKey: ctx.auth.developerApiKey });

    let params: { coin?: string; type?: string } = {};
    if (ctx.input.coin) params.coin = ctx.input.coin;
    if (ctx.input.poolType) params.type = ctx.input.poolType;

    ctx.progress('Fetching pool data from minerstat...');
    let pools = await client.getPools(Object.keys(params).length > 0 ? params : undefined);

    let mapped = pools.map(p => ({
      poolId: p.id,
      name: p.name,
      slug: p.url,
      description: p.description,
      website: p.website,
      founded: p.founded,
      poolType: p.type,
      coins: p.coins
    }));

    let filterDesc: any[] = [];
    if (ctx.input.coin) filterDesc.push(`coin: ${ctx.input.coin}`);
    if (ctx.input.poolType) filterDesc.push(`type: ${ctx.input.poolType}`);
    let filterText = filterDesc.length > 0 ? ` (filtered by ${filterDesc.join(', ')})` : '';

    return {
      output: {
        pools: mapped,
        totalCount: mapped.length
      },
      message: `Retrieved **${mapped.length}** mining pools${filterText}.`
    };
  })
  .build();
