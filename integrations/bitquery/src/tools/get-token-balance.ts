import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let balanceEntrySchema = z.object({
  tokenSymbol: z.string().optional().describe('Token symbol'),
  tokenName: z.string().optional().describe('Token name'),
  tokenAddress: z.string().optional().describe('Token contract/mint address'),
  tokenDecimals: z.number().optional().describe('Token decimals'),
  balance: z.number().optional().describe('Token balance')
});

export let getTokenBalance = SlateTool.create(spec, {
  name: 'Get Token Balances',
  key: 'get_token_balance',
  description: `Retrieve token balances for a wallet address on EVM blockchains or Solana. Returns all token holdings including ERC-20, ERC-721, and SPL tokens with their current balances.
Use this to check portfolio holdings, verify wallet balances, or monitor address token positions.`,
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
      walletAddress: z.string().describe('Wallet address to check balances for'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(50)
        .describe('Maximum number of token balances to return')
    })
  )
  .output(
    z.object({
      balances: z.array(balanceEntrySchema).describe('List of token balances'),
      walletAddress: z.string().describe('Queried wallet address'),
      tokenCount: z.number().describe('Number of tokens with balances')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, walletAddress, limit } = ctx.input;
    ctx.info(`Fetching token balances for ${walletAddress} on ${blockchain}`);

    let balances: z.infer<typeof balanceEntrySchema>[] = [];

    if (blockchain === 'solana') {
      let query = `query GetSolanaBalance($address: String!, $limit: Int!) {
  Solana(dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Account: {Address: {is: $address}}
        }
      }
    ) {
      Currency {
        Symbol
        Name
        MintAddress
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
    }
  }
}`;

      let data = await client.query(query, { address: walletAddress, limit });
      let raw = data?.Solana?.BalanceUpdates || [];

      balances = raw
        .map((b: any) => ({
          tokenSymbol: b.Currency?.Symbol,
          tokenName: b.Currency?.Name,
          tokenAddress: b.Currency?.MintAddress,
          balance: Number.parseFloat(b.balance) || 0
        }))
        .filter((b: any) => b.balance > 0);
    } else if (ctx.config.apiVersion === 'v1') {
      let query = `query GetBalance($network: EthereumNetwork!, $address: String!) {
  ethereum(network: $network) {
    address(address: {is: $address}) {
      balances {
        currency {
          symbol
          name
          address
          decimals
        }
        value
      }
    }
  }
}`;

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

      let data = await client.query(query, {
        network: networkMap[blockchain] || blockchain,
        address: walletAddress
      });

      let raw = data?.ethereum?.address?.[0]?.balances || [];

      balances = raw
        .slice(0, limit)
        .map((b: any) => ({
          tokenSymbol: b.currency?.symbol,
          tokenName: b.currency?.name,
          tokenAddress: b.currency?.address,
          tokenDecimals: b.currency?.decimals,
          balance: b.value
        }))
        .filter((b: any) => b.balance && b.balance > 0);
    } else {
      let query = `query GetBalance($network: evm_network!, $address: String!, $limit: Int!) {
  EVM(network: $network, dataset: combined) {
    BalanceUpdates(
      limit: {count: $limit}
      orderBy: {descendingByField: "balance"}
      where: {
        BalanceUpdate: {
          Address: {is: $address}
        }
      }
    ) {
      Currency {
        Symbol
        Name
        SmartContract
        Decimals
        Fungible
      }
      balance: sum(of: BalanceUpdate_Amount, selectWhere: {gt: "0"})
    }
  }
}`;

      let data = await client.query(query, {
        network: blockchain,
        address: walletAddress,
        limit
      });
      let raw = data?.EVM?.BalanceUpdates || [];

      balances = raw
        .map((b: any) => ({
          tokenSymbol: b.Currency?.Symbol,
          tokenName: b.Currency?.Name,
          tokenAddress: b.Currency?.SmartContract,
          tokenDecimals: b.Currency?.Decimals,
          balance: Number.parseFloat(b.balance) || 0
        }))
        .filter((b: any) => b.balance > 0);
    }

    return {
      output: {
        balances,
        walletAddress,
        tokenCount: balances.length
      },
      message: `Found **${balances.length}** token balance(s) for wallet \`${walletAddress}\` on **${blockchain}**.`
    };
  })
  .build();
