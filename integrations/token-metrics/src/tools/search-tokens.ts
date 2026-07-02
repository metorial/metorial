import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTokens = SlateTool.create(spec, {
  name: 'Search Tokens',
  key: 'search_tokens',
  description: `Search and discover cryptocurrencies supported by Token Metrics. Look up tokens by name, symbol, category, exchange, or contract address. Returns token details including price, market cap, volume, supply metrics, and contract addresses.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tokenId: z
        .string()
        .optional()
        .describe('Comma-separated Token Metrics IDs, e.g. "3375,3306"'),
      symbol: z.string().optional().describe('Comma-separated token symbols, e.g. "BTC,ETH"'),
      tokenName: z
        .string()
        .optional()
        .describe('Comma-separated token names, e.g. "Bitcoin,Ethereum"'),
      category: z
        .string()
        .optional()
        .describe('Comma-separated categories, e.g. "layer-1,defi,nft"'),
      exchange: z
        .string()
        .optional()
        .describe('Comma-separated exchanges, e.g. "binance,gate"'),
      blockchainAddress: z
        .string()
        .optional()
        .describe('Contract address in format "blockchain-name:0xaddress"'),
      minMarketCap: z.number().optional().describe('Minimum market cap in USD'),
      minVolume: z.number().optional().describe('Minimum 24h trading volume in USD'),
      minFdv: z.number().optional().describe('Minimum fully diluted valuation in USD'),
      limit: z.number().optional().describe('Number of results per page (default: 50)'),
      page: z.number().optional().describe('Page number for pagination (default: 1)')
    })
  )
  .output(
    z.object({
      tokens: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of token objects with details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTokens({
      tokenId: ctx.input.tokenId,
      symbol: ctx.input.symbol,
      tokenName: ctx.input.tokenName,
      category: ctx.input.category,
      exchange: ctx.input.exchange,
      blockchainAddress: ctx.input.blockchainAddress,
      marketcap: ctx.input.minMarketCap,
      volume: ctx.input.minVolume,
      fdv: ctx.input.minFdv,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let tokens = result?.data ?? [];

    return {
      output: { tokens },
      message: `Found **${tokens.length}** token(s).`
    };
  })
  .build();
