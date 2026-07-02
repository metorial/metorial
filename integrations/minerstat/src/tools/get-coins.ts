import { SlateTool } from 'slates';
import { z } from 'zod';
import { DeveloperClient } from '../lib/client';
import { spec } from '../spec';

export let getCoinsTool = SlateTool.create(spec, {
  name: 'Get Coins',
  key: 'get_coins',
  description: `Retrieve cryptocurrency coin data including market prices, mining difficulty, algorithms, rewards, and network hashrate. Filter by specific coin tickers or mining algorithms. Useful for profitability analysis and coin comparison.`,
  constraints: [
    'Requires a Developer API key from the minerstat Developer Portal',
    'Each request counts toward your monthly subscription quota'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tickers: z
        .string()
        .optional()
        .describe('Comma-separated coin tickers to filter (e.g. "BTC,BCH,BSV")'),
      algorithm: z
        .string()
        .optional()
        .describe('Comma-separated algorithm names to filter (e.g. "SHA-256,Scrypt")')
    })
  )
  .output(
    z.object({
      coins: z.array(
        z.object({
          coinId: z.string().describe('Unique coin identifier'),
          ticker: z.string().describe('Coin ticker symbol'),
          name: z.string().describe('Full coin name'),
          coinType: z.string().describe('Type: "coin" or "pool" (multi pool)'),
          algorithm: z.string().describe('Mining algorithm'),
          networkHashrate: z.number().describe('Network hashrate in H/s (-1 if unavailable)'),
          difficulty: z.number().describe('Current mining difficulty (-1 if unavailable)'),
          reward: z.number().describe('Reward per H/s per hour (-1 if unavailable)'),
          rewardUnit: z.string().describe('Reward denomination'),
          blockReward: z.number().describe('Block reward (-1 if unavailable)'),
          priceUsd: z.number().describe('Price in USD (-1 if unavailable)'),
          volumeUsd24h: z.number().describe('24h trading volume in USD (-1 if unavailable)'),
          lastUpdated: z.number().describe('UNIX timestamp of last update')
        })
      ),
      totalCount: z.number().describe('Number of coins returned')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.developerApiKey) {
      throw new Error(
        'Developer API key is required to query coin data. Please provide it in your authentication credentials.'
      );
    }

    let client = new DeveloperClient({ developerApiKey: ctx.auth.developerApiKey });

    let params: { list?: string; algo?: string } = {};
    if (ctx.input.tickers) params.list = ctx.input.tickers;
    if (ctx.input.algorithm) params.algo = ctx.input.algorithm;

    ctx.progress('Fetching coin data from minerstat...');
    let coins = await client.getCoins(Object.keys(params).length > 0 ? params : undefined);

    let mapped = coins.map(c => ({
      coinId: c.id,
      ticker: c.coin,
      name: c.name,
      coinType: c.type,
      algorithm: c.algorithm,
      networkHashrate: c.network_hashrate,
      difficulty: c.difficulty,
      reward: c.reward,
      rewardUnit: c.reward_unit,
      blockReward: c.reward_block,
      priceUsd: c.price,
      volumeUsd24h: c.volume,
      lastUpdated: c.updated
    }));

    let filterDesc: any[] = [];
    if (ctx.input.tickers) filterDesc.push(`tickers: ${ctx.input.tickers}`);
    if (ctx.input.algorithm) filterDesc.push(`algorithms: ${ctx.input.algorithm}`);
    let filterText = filterDesc.length > 0 ? ` (filtered by ${filterDesc.join(', ')})` : '';

    return {
      output: {
        coins: mapped,
        totalCount: mapped.length
      },
      message: `Retrieved **${mapped.length}** coins${filterText}.`
    };
  })
  .build();
