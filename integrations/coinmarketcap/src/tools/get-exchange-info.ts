import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let exchangeInfoSchema = z.object({
  exchangeId: z.number().describe('CoinMarketCap exchange ID'),
  name: z.string().describe('Exchange name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().describe('Exchange description'),
  dateLaunched: z.string().nullable().describe('Date the exchange was launched'),
  logo: z.string().describe('URL of the exchange logo'),
  urls: z
    .object({
      website: z.array(z.string()).describe('Official website URLs'),
      twitter: z.array(z.string()).describe('Twitter profile URLs'),
      blog: z.array(z.string()).describe('Blog URLs'),
      chat: z.array(z.string()).describe('Chat/community URLs'),
      fee: z.array(z.string()).describe('Fee schedule URLs')
    })
    .describe('Related links')
});

export let getExchangeInfo = SlateTool.create(spec, {
  name: 'Get Exchange Info',
  key: 'get_exchange_info',
  description: `Retrieve detailed metadata for one or more cryptocurrency exchanges including description, logo, website, social links, and launch date.`,
  instructions: [
    'Provide at least one of: exchangeIds or slugs.',
    'Multiple values can be comma-separated.'
  ],
  constraints: ['Requires Standard plan or above.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      exchangeIds: z
        .string()
        .optional()
        .describe('Comma-separated CoinMarketCap exchange IDs'),
      slugs: z
        .string()
        .optional()
        .describe('Comma-separated exchange slugs (e.g., "binance,coinbase-exchange")')
    })
  )
  .output(
    z.object({
      exchanges: z.array(exchangeInfoSchema).describe('List of exchange metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let data = await client.getExchangeInfo({
      id: ctx.input.exchangeIds,
      slug: ctx.input.slugs
    });

    let exchanges: z.infer<typeof exchangeInfoSchema>[] = [];
    for (let [, value] of Object.entries(data)) {
      let items = Array.isArray(value) ? value : [value];
      for (let item of items) {
        exchanges.push({
          exchangeId: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description,
          dateLaunched: item.dateLaunched,
          logo: item.logo,
          urls: item.urls || {
            website: [],
            twitter: [],
            blog: [],
            chat: [],
            fee: []
          }
        });
      }
    }

    let names = exchanges.map(e => `**${e.name}**`).join(', ');
    let message =
      exchanges.length > 0
        ? `Retrieved metadata for ${exchanges.length} exchange(s): ${names}.`
        : 'No exchange metadata found.';

    return {
      output: { exchanges },
      message
    };
  })
  .build();
