import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient, toBitqueryNumber } from '../lib/client';
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
  description: `Retrieve token balances for a wallet address on EVM blockchains or Solana. Returns current EVM token balances and the latest recently active Solana token-account balances.
Use this to check portfolio holdings, verify wallet balances, or monitor address token positions.`,
  instructions: [
    'Solana uses V2 and only includes accounts with a balance update in the provider retention window (about 8 hours); an absent token does not prove a zero balance. Solana returns the latest token account per mint, so wallets holding the same mint in several token accounts need a custom query to combine them.'
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
      apiVersion: ctx.auth.apiVersion
    });

    let { blockchain, walletAddress, limit } = ctx.input;
    ctx.info(`Fetching token balances for ${walletAddress} on ${blockchain}`);

    let balances: z.infer<typeof balanceEntrySchema>[] = [];

    if (blockchain === 'solana') {
      client.requireV2('Solana convenience queries');
      let query = `query GetSolanaBalance($address: String!, $limit: Int!) {
  Solana(dataset: realtime) {
    BalanceUpdates(
      limit: {count: $limit}
      limitBy: {by: BalanceUpdate_Currency_MintAddress, count: 1}
      orderBy: [{descending: Block_Slot}, {descending: Transaction_Index}]
      where: {BalanceUpdate: {Account: {Owner: {is: $address}}}}
    ) {
      BalanceUpdate {
        PostBalance
        Currency { Symbol Name MintAddress Decimals }
      }
    }
  }
}`;

      let data = await client.query(query, { address: walletAddress, limit });
      let raw = data?.Solana?.BalanceUpdates || [];
      balances = raw
        .map((b: any) => ({
          tokenSymbol: b.BalanceUpdate?.Currency?.Symbol,
          tokenName: b.BalanceUpdate?.Currency?.Name,
          tokenAddress: b.BalanceUpdate?.Currency?.MintAddress,
          tokenDecimals: b.BalanceUpdate?.Currency?.Decimals,
          balance: toBitqueryNumber(b.BalanceUpdate?.PostBalance)
        }))
        .filter((b: any) => Number.isFinite(b.balance) && b.balance > 0);
    } else if (ctx.auth.apiVersion === 'v1') {
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
        avalanche: 'avalanche',
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
          balance: toBitqueryNumber(b.value)
        }))
        .filter((b: any) => b.balance && b.balance > 0);
    } else {
      let query = `query GetBalance($network: evm_network!, $address: String!, $limit: Int!) {
  EVM(network: $network, dataset: combined) {
    Balances(
      limit: {count: $limit}
      orderBy: {descending: Balance_AmountInUSD}
      where: {Balance: {Address: {is: $address}}}
    ) {
      Currency { Symbol Name SmartContract Decimals }
      Balance { Amount(selectWhere: {gt: "0"}) }
    }
  }
}`;
      let data = await client.query(query, {
        network: blockchain,
        address: walletAddress,
        limit
      });
      let raw = data?.EVM?.Balances || [];
      balances = raw
        .map((b: any) => ({
          tokenSymbol: b.Currency?.Symbol,
          tokenName: b.Currency?.Name,
          tokenAddress: b.Currency?.SmartContract,
          tokenDecimals: b.Currency?.Decimals,
          balance: toBitqueryNumber(b.Balance?.Amount)
        }))
        .filter((b: any) => Number.isFinite(b.balance) && b.balance > 0);
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
