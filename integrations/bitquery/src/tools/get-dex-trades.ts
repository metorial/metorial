import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let _evmNetworkSchema = z
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
    'cronos'
  ])
  .describe('EVM network identifier');

let tradeOutputSchema = z.object({
  blockTime: z.string().describe('Timestamp of the block containing the trade'),
  blockNumber: z.number().optional().describe('Block number'),
  transactionHash: z.string().describe('Transaction hash'),
  amount: z.number().optional().describe('Base token trade amount'),
  amountInUsd: z.number().optional().describe('Trade amount in USD'),
  price: z.number().optional().describe('Trade price in quote currency'),
  priceInUsd: z.number().optional().describe('Trade price in USD'),
  baseTokenSymbol: z.string().optional().describe('Base token symbol'),
  baseTokenName: z.string().optional().describe('Base token name'),
  baseTokenAddress: z.string().optional().describe('Base token smart contract address'),
  quoteTokenSymbol: z.string().optional().describe('Quote token symbol'),
  quoteTokenName: z.string().optional().describe('Quote token name'),
  quoteTokenAddress: z.string().optional().describe('Quote token smart contract address'),
  dexProtocol: z.string().optional().describe('DEX protocol name'),
  dexFamily: z.string().optional().describe('DEX protocol family'),
  sideType: z.string().optional().describe('Trade side type (buy/sell)'),
  sideAmount: z.number().optional().describe('Quote side amount'),
  sideAmountInUsd: z.number().optional().describe('Quote side amount in USD')
});

export let getDexTrades = SlateTool.create(spec, {
  name: 'Get DEX Trades',
  key: 'get_dex_trades',
  description: `Retrieve decentralized exchange (DEX) trade data from EVM blockchains or Solana. Query historical and recent trades filtered by token pair, DEX protocol, time range, and network.
Supports major DEXs like Uniswap, PancakeSwap, Raydium, Jupiter, and more across Ethereum, BSC, Polygon, Arbitrum, Base, Solana, and other networks.`,
  instructions: [
    'Token addresses must be smart contract addresses (EVM) or mint addresses (Solana).',
    'For Solana, set the blockchain to "solana". For EVM chains, use the network name.'
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
      baseCurrency: z
        .string()
        .optional()
        .describe('Base token contract/mint address to filter trades'),
      quoteCurrency: z
        .string()
        .optional()
        .describe('Quote token contract/mint address to filter trades'),
      dexProtocol: z
        .string()
        .optional()
        .describe('DEX protocol name to filter (e.g., "Uniswap", "PancakeSwap", "Raydium")'),
      since: z
        .string()
        .optional()
        .describe('Start datetime filter (ISO 8601 format, e.g., "2024-01-01T00:00:00Z")'),
      till: z.string().optional().describe('End datetime filter (ISO 8601 format)'),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .default(25)
        .describe('Maximum number of trades to return')
    })
  )
  .output(
    z.object({
      trades: z.array(tradeOutputSchema).describe('List of DEX trades'),
      tradeCount: z.number().describe('Number of trades returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, baseCurrency, quoteCurrency, dexProtocol, since, till, limit } =
      ctx.input;

    ctx.info(`Fetching DEX trades on ${blockchain}`);

    let trades: z.infer<typeof tradeOutputSchema>[] = [];

    if (ctx.config.apiVersion === 'v1' && blockchain !== 'solana') {
      let query = buildV1DexTradesQuery(baseCurrency, quoteCurrency, dexProtocol, since, till);
      let variables: Record<string, any> = {
        network: mapToV1Network(blockchain),
        limit,
        offset: 0
      };
      if (baseCurrency) variables.baseCurrency = baseCurrency;
      if (quoteCurrency) variables.quoteCurrency = quoteCurrency;
      if (dexProtocol) variables.exchange = dexProtocol;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let rawTrades = data?.ethereum?.dexTrades || [];

      trades = rawTrades.map((t: any) => ({
        blockTime: t.block?.timestamp?.iso8601 || '',
        blockNumber: t.block?.height,
        transactionHash: t.transaction?.hash || '',
        amount: t.baseAmount,
        amountInUsd: t.tradeAmount,
        price: t.quotePrice,
        baseTokenSymbol: t.baseCurrency?.symbol,
        baseTokenName: t.baseCurrency?.name,
        baseTokenAddress: t.baseCurrency?.address,
        quoteTokenSymbol: t.quoteCurrency?.symbol,
        quoteTokenName: t.quoteCurrency?.name,
        quoteTokenAddress: t.quoteCurrency?.address,
        dexProtocol: t.exchange?.fullName,
        sideType: t.side
      }));
    } else if (blockchain === 'solana') {
      let query = buildSolanaDexTradesQuery(baseCurrency, quoteCurrency, since, till);
      let variables: Record<string, any> = { limit };
      if (baseCurrency) variables.baseCurrency = baseCurrency;
      if (quoteCurrency) variables.quoteCurrency = quoteCurrency;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let rawTrades = data?.Solana?.DEXTradeByTokens || [];

      trades = rawTrades.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Slot,
        transactionHash: t.Transaction?.Signature || '',
        amount: t.Trade?.Amount,
        amountInUsd: t.Trade?.AmountInUSD,
        price: t.Trade?.Price,
        priceInUsd: t.Trade?.PriceInUSD,
        baseTokenSymbol: t.Trade?.Currency?.Symbol,
        baseTokenName: t.Trade?.Currency?.Name,
        baseTokenAddress: t.Trade?.Currency?.MintAddress,
        quoteTokenSymbol: t.Trade?.Side?.Currency?.Symbol,
        quoteTokenName: t.Trade?.Side?.Currency?.Name,
        quoteTokenAddress: t.Trade?.Side?.Currency?.MintAddress,
        dexProtocol: t.Trade?.Dex?.ProtocolName,
        dexFamily: t.Trade?.Dex?.ProtocolFamily,
        sideType: t.Trade?.Side?.Type,
        sideAmount: t.Trade?.Side?.Amount,
        sideAmountInUsd: t.Trade?.Side?.AmountInUSD
      }));
    } else {
      // V2 EVM query
      let query = buildV2EvmDexTradesQuery(
        baseCurrency,
        quoteCurrency,
        dexProtocol,
        since,
        till
      );
      let variables: Record<string, any> = {
        network: blockchain,
        limit
      };
      if (baseCurrency) variables.baseCurrency = baseCurrency;
      if (quoteCurrency) variables.quoteCurrency = quoteCurrency;
      if (dexProtocol) variables.exchange = dexProtocol;
      if (since) variables.since = since;
      if (till) variables.till = till;

      let data = await client.query(query, variables);
      let rawTrades = data?.EVM?.DEXTradeByTokens || [];

      trades = rawTrades.map((t: any) => ({
        blockTime: t.Block?.Time || '',
        blockNumber: t.Block?.Number,
        transactionHash: t.Transaction?.Hash || '',
        amount: t.Trade?.Amount,
        amountInUsd: t.Trade?.AmountInUSD,
        price: t.Trade?.Price,
        priceInUsd: t.Trade?.PriceInUSD,
        baseTokenSymbol: t.Trade?.Currency?.Symbol,
        baseTokenName: t.Trade?.Currency?.Name,
        baseTokenAddress: t.Trade?.Currency?.SmartContract,
        quoteTokenSymbol: t.Trade?.Side?.Currency?.Symbol,
        quoteTokenName: t.Trade?.Side?.Currency?.Name,
        quoteTokenAddress: t.Trade?.Side?.Currency?.SmartContract,
        dexProtocol: t.Trade?.Dex?.ProtocolName,
        dexFamily: t.Trade?.Dex?.ProtocolFamily,
        sideType: t.Trade?.Side?.Type,
        sideAmount: t.Trade?.Side?.Amount,
        sideAmountInUsd: t.Trade?.Side?.AmountInUSD
      }));
    }

    return {
      output: {
        trades,
        tradeCount: trades.length
      },
      message: `Retrieved **${trades.length}** DEX trade(s) on **${blockchain}**.`
    };
  })
  .build();

let mapToV1Network = (chain: string): string => {
  let map: Record<string, string> = {
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
  return map[chain] || chain;
};

let buildV1DexTradesQuery = (
  baseCurrency?: string,
  quoteCurrency?: string,
  exchange?: string,
  since?: string,
  till?: string
): string => {
  let filters: string[] = [];
  filters.push('options: {limit: $limit, offset: $offset, desc: "block.timestamp.iso8601"}');
  if (since || till) filters.push('date: {since: $since, till: $till}');
  if (baseCurrency) filters.push('baseCurrency: {is: $baseCurrency}');
  if (quoteCurrency) filters.push('quoteCurrency: {is: $quoteCurrency}');
  if (exchange) filters.push('exchangeName: {is: $exchange}');

  let varDefs: string[] = ['$network: EthereumNetwork!', '$limit: Int!', '$offset: Int!'];
  if (since) varDefs.push('$since: ISO8601DateTime');
  if (till) varDefs.push('$till: ISO8601DateTime');
  if (baseCurrency) varDefs.push('$baseCurrency: String');
  if (quoteCurrency) varDefs.push('$quoteCurrency: String');
  if (exchange) varDefs.push('$exchange: String');

  return `query GetDEXTrades(${varDefs.join(', ')}) {
  ethereum(network: $network) {
    dexTrades(${filters.join(', ')}) {
      block { timestamp { iso8601 } height }
      transaction { hash }
      tradeAmount(in: USD)
      baseAmount
      quoteAmount
      baseCurrency { symbol name address }
      quoteCurrency { symbol name address }
      quotePrice
      exchange { fullName }
      side
    }
  }
}`;
};

let buildV2EvmDexTradesQuery = (
  baseCurrency?: string,
  quoteCurrency?: string,
  exchange?: string,
  since?: string,
  till?: string
): string => {
  let whereFilters: string[] = [];
  if (baseCurrency) whereFilters.push('Currency: {SmartContract: {is: $baseCurrency}}');
  if (quoteCurrency)
    whereFilters.push('Side: {Currency: {SmartContract: {is: $quoteCurrency}}}');
  if (exchange) whereFilters.push('Dex: {ProtocolName: {is: $exchange}}');

  let tradeFilter = whereFilters.length > 0 ? `Trade: {${whereFilters.join(', ')}}` : '';
  let timeFilter =
    since || till
      ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
      : '';

  let allWhereFilters = [tradeFilter, timeFilter].filter(Boolean).join(', ');
  let whereClause = allWhereFilters ? `where: {${allWhereFilters}}` : '';

  let varDefs: string[] = ['$network: evm_network!', '$limit: Int!'];
  if (baseCurrency) varDefs.push('$baseCurrency: String');
  if (quoteCurrency) varDefs.push('$quoteCurrency: String');
  if (exchange) varDefs.push('$exchange: String');
  if (since) varDefs.push('$since: DateTime');
  if (till) varDefs.push('$till: DateTime');

  return `query GetDEXTrades(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Number }
      Transaction { Hash }
      Trade {
        Amount AmountInUSD Price PriceInUSD
        Currency { Symbol Name SmartContract }
        Dex { ProtocolName ProtocolFamily }
        Side {
          Type Amount AmountInUSD
          Currency { Symbol Name SmartContract }
        }
      }
    }
  }
}`;
};

let buildSolanaDexTradesQuery = (
  baseCurrency?: string,
  quoteCurrency?: string,
  since?: string,
  till?: string
): string => {
  let whereFilters: string[] = [];
  if (baseCurrency) whereFilters.push('Currency: {MintAddress: {is: $baseCurrency}}');
  if (quoteCurrency)
    whereFilters.push('Side: {Currency: {MintAddress: {is: $quoteCurrency}}}');

  let tradeFilter = whereFilters.length > 0 ? `Trade: {${whereFilters.join(', ')}}` : '';
  let timeFilter =
    since || till
      ? `Block: {Time: {${since ? 'since: $since' : ''}${since && till ? ', ' : ''}${till ? 'till: $till' : ''}}}`
      : '';

  let allWhereFilters = [tradeFilter, timeFilter].filter(Boolean).join(', ');
  let whereClause = allWhereFilters ? `where: {${allWhereFilters}}` : '';

  let varDefs: string[] = ['$limit: Int!'];
  if (baseCurrency) varDefs.push('$baseCurrency: String');
  if (quoteCurrency) varDefs.push('$quoteCurrency: String');
  if (since) varDefs.push('$since: DateTime');
  if (till) varDefs.push('$till: DateTime');

  return `query GetSolanaDEXTrades(${varDefs.join(', ')}) {
  Solana(dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      ${whereClause}
    ) {
      Block { Time Slot }
      Transaction { Signature }
      Trade {
        Amount AmountInUSD Price PriceInUSD
        Currency { Symbol Name MintAddress }
        Dex { ProtocolName ProtocolFamily ProgramAddress }
        Side {
          Type Amount AmountInUSD
          Currency { Symbol Name MintAddress }
        }
        Market { MarketAddress }
      }
    }
  }
}`;
};
