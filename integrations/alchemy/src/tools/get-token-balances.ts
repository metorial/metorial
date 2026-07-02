import { SlateTool } from 'slates';
import { z } from 'zod';
import { AlchemyClient } from '../lib/client';
import { spec } from '../spec';

export let getTokenBalances = SlateTool.create(spec, {
  name: 'Get Token Balances',
  key: 'get_token_balances',
  description: `Retrieve ERC-20 token balances for a wallet address, optionally filtered to specific token contracts. Also fetches token metadata (name, symbol, decimals) for each token found.
Use this to check what tokens a wallet holds and their balances.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      walletAddress: z
        .string()
        .describe('The wallet address to get token balances for (e.g., 0x...)'),
      tokenAddresses: z
        .array(z.string())
        .optional()
        .describe(
          'Specific ERC-20 contract addresses to check. If omitted, returns all ERC-20 token balances.'
        ),
      pageKey: z
        .string()
        .optional()
        .describe('Pagination key for fetching the next page of results')
    })
  )
  .output(
    z.object({
      walletAddress: z.string().describe('The queried wallet address'),
      tokenBalances: z
        .array(
          z.object({
            contractAddress: z.string().describe('The token contract address'),
            balance: z.string().describe('The raw token balance in hex'),
            name: z.string().optional().describe('Token name'),
            symbol: z.string().optional().describe('Token symbol'),
            decimals: z.number().optional().describe('Token decimals')
          })
        )
        .describe('List of token balances'),
      pageKey: z.string().optional().describe('Pagination key for fetching the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AlchemyClient({
      token: ctx.auth.token,
      network: ctx.config.network
    });

    let result = await client.getTokenBalances(
      ctx.input.walletAddress,
      ctx.input.tokenAddresses,
      ctx.input.pageKey
    );

    let tokenBalances: {
      contractAddress: string;
      balance: string;
      name?: string;
      symbol?: string;
      decimals?: number;
    }[] = [];

    let balances = result.tokenBalances || [];
    for (let tb of balances) {
      if (tb.tokenBalance === '0x0' || tb.tokenBalance === '0x') continue;
      let metadata: any = {};
      try {
        metadata = await client.getTokenMetadata(tb.contractAddress);
      } catch {
        // Metadata fetch may fail for some tokens
      }
      tokenBalances.push({
        contractAddress: tb.contractAddress,
        balance: tb.tokenBalance,
        name: metadata.name || undefined,
        symbol: metadata.symbol || undefined,
        decimals: metadata.decimals ?? undefined
      });
    }

    return {
      output: {
        walletAddress: ctx.input.walletAddress,
        tokenBalances,
        pageKey: result.pageKey || undefined
      },
      message: `Found **${tokenBalances.length}** token balance(s) for \`${ctx.input.walletAddress}\`${
        tokenBalances.length > 0
          ? `: ${tokenBalances
              .slice(0, 5)
              .map(t => `${t.symbol || t.contractAddress.slice(0, 10)}`)
              .join(', ')}${tokenBalances.length > 5 ? '...' : ''}`
          : '.'
      }`
    };
  })
  .build();
