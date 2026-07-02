import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let urlsSchema = z.object({
  website: z.array(z.string()).describe('Official website URLs'),
  twitter: z.array(z.string()).describe('Twitter profile URLs'),
  messageBoard: z.array(z.string()).describe('Message board URLs'),
  chat: z.array(z.string()).describe('Chat/community URLs'),
  facebook: z.array(z.string()).describe('Facebook page URLs'),
  explorer: z.array(z.string()).describe('Blockchain explorer URLs'),
  reddit: z.array(z.string()).describe('Reddit URLs'),
  technicalDoc: z.array(z.string()).describe('Technical documentation/whitepaper URLs'),
  sourceCode: z.array(z.string()).describe('Source code repository URLs'),
  announcement: z.array(z.string()).describe('Announcement page URLs')
});

let platformSchema = z
  .object({
    id: z.number().describe('Platform CoinMarketCap ID'),
    name: z.string().describe('Platform name'),
    symbol: z.string().describe('Platform symbol'),
    slug: z.string().describe('Platform slug'),
    tokenAddress: z.string().describe('Token contract address')
  })
  .nullable();

let infoSchema = z.object({
  cryptocurrencyId: z.number().describe('CoinMarketCap cryptocurrency ID'),
  name: z.string().describe('Cryptocurrency name'),
  symbol: z.string().describe('Cryptocurrency ticker symbol'),
  slug: z.string().describe('URL-friendly slug'),
  category: z.string().describe('Category (coin or token)'),
  description: z.string().describe('Cryptocurrency description'),
  dateAdded: z.string().describe('Date added to CoinMarketCap'),
  dateLaunched: z.string().nullable().describe('Launch date'),
  logo: z.string().describe('URL of the logo image (64x64 PNG by default)'),
  tags: z.array(z.string()).describe('Associated tags'),
  platform: platformSchema.describe('Token platform info if token-based'),
  urls: urlsSchema.describe('Related links and resources')
});

export let getCryptocurrencyInfo = SlateTool.create(spec, {
  name: 'Get Cryptocurrency Info',
  key: 'get_cryptocurrency_info',
  description: `Retrieve detailed metadata for one or more cryptocurrencies including description, logo, website, social links, explorers, source code, and platform details. Useful for getting comprehensive information about a cryptocurrency beyond market data.`,
  instructions: [
    'Provide at least one of: cryptocurrencyIds, symbols, or slugs.',
    'Multiple values can be comma-separated.',
    'Logo URLs default to 64x64 PNG. Replace "64x64" in the URL with 16, 32, 128, or 200 for other sizes.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cryptocurrencyIds: z
        .string()
        .optional()
        .describe('Comma-separated CoinMarketCap IDs (e.g., "1,1027")'),
      symbols: z.string().optional().describe('Comma-separated symbols (e.g., "BTC,ETH")'),
      slugs: z.string().optional().describe('Comma-separated slugs (e.g., "bitcoin,ethereum")')
    })
  )
  .output(
    z.object({
      cryptocurrencies: z.array(infoSchema).describe('List of cryptocurrency metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let data = await client.getCryptocurrencyInfo({
      id: ctx.input.cryptocurrencyIds,
      slug: ctx.input.slugs,
      symbol: ctx.input.symbols
    });

    let cryptocurrencies: z.infer<typeof infoSchema>[] = [];
    for (let [, value] of Object.entries(data)) {
      let items = Array.isArray(value) ? value : [value];
      for (let item of items) {
        cryptocurrencies.push({
          cryptocurrencyId: item.id,
          name: item.name,
          symbol: item.symbol,
          slug: item.slug,
          category: item.category,
          description: item.description,
          dateAdded: item.dateAdded,
          dateLaunched: item.dateLaunched,
          logo: item.logo,
          tags: item.tags || [],
          platform: item.platform,
          urls: item.urls || {
            website: [],
            twitter: [],
            messageBoard: [],
            chat: [],
            facebook: [],
            explorer: [],
            reddit: [],
            technicalDoc: [],
            sourceCode: [],
            announcement: []
          }
        });
      }
    }

    let names = cryptocurrencies.map(c => `**${c.name}** (${c.symbol})`).join(', ');
    let message =
      cryptocurrencies.length > 0
        ? `Retrieved metadata for ${cryptocurrencies.length} cryptocurrency(ies): ${names}.`
        : `No metadata found for the specified cryptocurrencies.`;

    return {
      output: { cryptocurrencies },
      message
    };
  })
  .build();
