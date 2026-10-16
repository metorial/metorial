import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient, toBitqueryNumber } from '../lib/client';
import { spec } from '../spec';

let holderSchema = z.object({
  holderAddress: z.string().describe('Holder wallet address'),
  balance: z.number().optional().describe('Token balance')
});

export let getTokenHolders = SlateTool.create(spec, {
  name: 'Get Token Holders',
  key: 'get_token_holders',
  description: `Retrieve the top holders of a specific token on EVM blockchains or Solana. Returns current EVM holder rankings. Solana rankings cover net balance movements for tokens launched within the recent retention window.
Use this for token distribution analysis, identifying whales, or tracking holder concentrations.`,
  instructions: [
    'Requires V2 API. EVM uses current holder balances.',
    'Solana uses successful balance updates grouped by wallet owner over about 8 hours. It is complete only for tokens launched within that window; do not treat older-token results as complete holder rankings.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      blockchain: z
        .enum([
          'eth',
          'bsc',
          'matic',
          'arbitrum',
          'base',
          'optimism',
          'opbnb',
          'avalanche',
          'fantom',
          'cronos',
          'solana'
        ])
        .describe('Blockchain network to query'),
      tokenAddress: z.string().describe('Token contract/mint address'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(50)
        .describe('Maximum number of top holders to return')
    })
  )
  .output(
    z.object({
      holders: z.array(holderSchema).describe('List of top token holders'),
      holderCount: z.number().describe('Number of holders returned'),
      tokenAddress: z.string().describe('Queried token address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.auth.apiVersion
    });

    let { blockchain, tokenAddress, limit } = ctx.input;
    if (ctx.auth.apiVersion === 'v1') {
      throw createApiServiceError(
        'Token holder rankings require a Bitquery V2 connection. Connect using Bearer Token (V2) or OAuth2 Client Credentials (V2).'
      );
    }
    ctx.info(`Fetching top holders for token ${tokenAddress} on ${blockchain}`);

    let holders: z.infer<typeof holderSchema>[] = [];

    if (blockchain === 'solana') {
      client.requireV2('Solana convenience queries');
      let query = `query GetSolanaTokenHolders($tokenAddress: String!, $limit: Int!) {
  Solana(dataset: realtime) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Currency: {MintAddress: {is: $tokenAddress}}
        }
        Transaction: {Result: {Success: true}}
      }
    ) {
      BalanceUpdate {
        Account {
          Owner
        }
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
    }
  }
}`;

      let data = await client.query(query, { tokenAddress, limit });
      let raw = data?.Solana?.BalanceUpdates || [];

      holders = raw
        .map((h: any) => ({
          holderAddress: h.BalanceUpdate?.Account?.Owner,
          balance: toBitqueryNumber(h.balance)
        }))
        .filter((h: any) => Number.isFinite(h.balance) && h.balance > 0 && h.holderAddress);
    } else {
      let query = `query GetTokenHolders($network: evm_network!, $tokenAddress: String!, $limit: Int!) {
  EVM(network: $network, dataset: combined) {
    Holders(
      limit: {count: $limit}
      orderBy: {descending: Balance_Amount}
      where: {Currency: {SmartContract: {is: $tokenAddress}}}
    ) {
      Holder { Address }
      Balance { Amount(selectWhere: {gt: "0"}) }
    }
  }
}`;
      let data = await client.query(query, { network: blockchain, tokenAddress, limit });
      let raw = data?.EVM?.Holders || [];
      holders = raw
        .map((h: any) => ({
          holderAddress: h.Holder?.Address,
          balance: toBitqueryNumber(h.Balance?.Amount)
        }))
        .filter((h: any) => Number.isFinite(h.balance) && h.balance > 0 && h.holderAddress);
    }

    return {
      output: {
        holders,
        holderCount: holders.length,
        tokenAddress
      },
      message: `Retrieved **${holders.length}** top holder(s) for token \`${tokenAddress}\` on **${blockchain}**.`
    };
  })
  .build();
