import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let holderSchema = z.object({
  holderAddress: z.string().describe('Holder wallet address'),
  balance: z.number().optional().describe('Token balance')
});

export let getTokenHolders = SlateTool.create(spec, {
  name: 'Get Token Holders',
  key: 'get_token_holders',
  description: `Retrieve the top holders of a specific token on EVM blockchains or Solana. Returns addresses ranked by balance for any ERC-20 or SPL token.
Use this for token distribution analysis, identifying whales, or tracking holder concentrations.`,
  instructions: [
    'Requires V2 API for best results.',
    'Uses BalanceUpdates to aggregate net token movements per address.'
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
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, tokenAddress, limit } = ctx.input;
    ctx.info(`Fetching top holders for token ${tokenAddress} on ${blockchain}`);

    let holders: z.infer<typeof holderSchema>[] = [];

    if (blockchain === 'solana') {
      let query = `query GetSolanaTokenHolders($tokenAddress: String!, $limit: Int!) {
  Solana(dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Currency: {MintAddress: {is: $tokenAddress}}
        }
      }
    ) {
      BalanceUpdate {
        Account {
          Address
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
          holderAddress: h.BalanceUpdate?.Account?.Address || '',
          balance: Number.parseFloat(h.balance) || 0
        }))
        .filter((h: any) => h.balance > 0 && h.holderAddress);
    } else if (ctx.config.apiVersion === 'v1') {
      let networkMap: Record<string, string> = {
        eth: 'ethereum',
        bsc: 'bsc',
        matic: 'matic',
        arbitrum: 'arbitrum',
        base: 'base',
        optimism: 'optimism',
        avalanche: 'avalanche_c',
        fantom: 'fantom',
        cronos: 'cronos'
      };

      let query = `query GetTokenHolders($network: EthereumNetwork!, $tokenAddress: String!, $limit: Int!) {
  ethereum(network: $network) {
    address(
      address: {notIn: ["0x0000000000000000000000000000000000000000"]}
    ) {
      balances(
        currency: {is: $tokenAddress}
        options: {limit: $limit, desc: "value"}
      ) {
        address {
          address
        }
        value
      }
    }
  }
}`;

      let data = await client.query(query, {
        network: networkMap[blockchain] || blockchain,
        tokenAddress,
        limit
      });

      let raw = data?.ethereum?.address?.[0]?.balances || [];

      holders = raw
        .map((h: any) => ({
          holderAddress: h.address?.address || '',
          balance: h.value
        }))
        .filter((h: any) => h.balance > 0 && h.holderAddress);
    } else {
      let query = `query GetTokenHolders($network: evm_network!, $tokenAddress: String!, $limit: Int!) {
  EVM(network: $network, dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        Currency: {SmartContract: {is: $tokenAddress}}
      }
    ) {
      BalanceUpdate {
        Address
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
    }
  }
}`;

      let data = await client.query(query, { network: blockchain, tokenAddress, limit });
      let raw = data?.EVM?.BalanceUpdates || [];

      holders = raw
        .map((h: any) => ({
          holderAddress: h.BalanceUpdate?.Address || '',
          balance: Number.parseFloat(h.balance) || 0
        }))
        .filter((h: any) => h.balance > 0 && h.holderAddress);
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
