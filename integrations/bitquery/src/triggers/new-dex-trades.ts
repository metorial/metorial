import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let tradeInputSchema = z.object({
  blockTime: z.string(),
  blockNumber: z.number().optional(),
  transactionHash: z.string(),
  amount: z.number().optional(),
  amountInUsd: z.number().optional(),
  price: z.number().optional(),
  priceInUsd: z.number().optional(),
  baseTokenSymbol: z.string().optional(),
  baseTokenName: z.string().optional(),
  baseTokenAddress: z.string().optional(),
  quoteTokenSymbol: z.string().optional(),
  quoteTokenName: z.string().optional(),
  quoteTokenAddress: z.string().optional(),
  dexProtocol: z.string().optional(),
  dexFamily: z.string().optional(),
  sideType: z.string().optional(),
  sideAmount: z.number().optional(),
  sideAmountInUsd: z.number().optional(),
  buyer: z.string().optional(),
  seller: z.string().optional()
});

export let newDexTrades = SlateTrigger.create(spec, {
  name: 'New DEX Trades',
  key: 'new_dex_trades',
  description:
    'Triggers when new DEX trades are detected on a specified blockchain. Polls for recent trades and emits new ones since the last check. Supports EVM chains and Solana.'
})
  .input(tradeInputSchema)
  .output(
    z.object({
      blockTime: z.string().describe('Timestamp of the block containing the trade'),
      blockNumber: z.number().optional().describe('Block number or slot'),
      transactionHash: z.string().describe('Transaction hash or signature'),
      amount: z.number().optional().describe('Base token trade amount'),
      amountInUsd: z.number().optional().describe('Trade amount in USD'),
      price: z.number().optional().describe('Trade price'),
      priceInUsd: z.number().optional().describe('Trade price in USD'),
      baseTokenSymbol: z.string().optional().describe('Base token symbol'),
      baseTokenName: z.string().optional().describe('Base token name'),
      baseTokenAddress: z.string().optional().describe('Base token address'),
      quoteTokenSymbol: z.string().optional().describe('Quote token symbol'),
      quoteTokenName: z.string().optional().describe('Quote token name'),
      quoteTokenAddress: z.string().optional().describe('Quote token address'),
      dexProtocol: z.string().optional().describe('DEX protocol name'),
      dexFamily: z.string().optional().describe('DEX protocol family'),
      sideType: z.string().optional().describe('Trade side type'),
      sideAmount: z.number().optional().describe('Quote side amount'),
      sideAmountInUsd: z.number().optional().describe('Quote side amount in USD'),
      buyer: z.string().optional().describe('Buyer address'),
      seller: z.string().optional().describe('Seller address')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new BitqueryClient({
        token: ctx.auth.token,
        apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
      });

      let settings = ctx.state?.settings || {};
      let blockchain = settings.blockchain || 'eth';
      let baseCurrency = settings.baseCurrency;
      let quoteCurrency = settings.quoteCurrency;
      let dexProtocol = settings.dexProtocol;

      let lastPollTime =
        ctx.state?.lastPollTime || new Date(Date.now() - 5 * 60 * 1000).toISOString();
      let now = new Date().toISOString();

      let trades: z.infer<typeof tradeInputSchema>[] = [];

      try {
        if (blockchain === 'solana') {
          let query = buildSolanaTradesQuery(baseCurrency, quoteCurrency);
          let variables: Record<string, any> = { limit: 100, since: lastPollTime };
          if (baseCurrency) variables.baseCurrency = baseCurrency;
          if (quoteCurrency) variables.quoteCurrency = quoteCurrency;

          let data = await client.query(query, variables);
          let raw = data?.Solana?.DEXTradeByTokens || [];

          trades = raw.map((t: any) => ({
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
          let query = buildEvmTradesQuery(
            baseCurrency,
            quoteCurrency,
            dexProtocol,
            ctx.config.apiVersion as string
          );
          let variables: Record<string, any> = {
            network: blockchain,
            limit: 100,
            since: lastPollTime
          };
          if (baseCurrency) variables.baseCurrency = baseCurrency;
          if (quoteCurrency) variables.quoteCurrency = quoteCurrency;
          if (dexProtocol) variables.exchange = dexProtocol;

          let data = await client.query(query, variables);

          if (ctx.config.apiVersion === 'v1') {
            let raw = data?.ethereum?.dexTrades || [];
            trades = raw.map((t: any) => ({
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
          } else {
            let raw = data?.EVM?.DEXTradeByTokens || [];
            trades = raw.map((t: any) => ({
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
              sideAmountInUsd: t.Trade?.Side?.AmountInUSD,
              buyer: t.Trade?.Buyer,
              seller: t.Trade?.Seller
            }));
          }
        }
      } catch (_error) {
        // Return empty on error, will retry next poll
      }

      return {
        inputs: trades,
        updatedState: {
          lastPollTime: now,
          settings
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'dex_trade.created',
        id: ctx.input.transactionHash || `${ctx.input.blockTime}-${ctx.input.blockNumber}`,
        output: {
          blockTime: ctx.input.blockTime,
          blockNumber: ctx.input.blockNumber,
          transactionHash: ctx.input.transactionHash,
          amount: ctx.input.amount,
          amountInUsd: ctx.input.amountInUsd,
          price: ctx.input.price,
          priceInUsd: ctx.input.priceInUsd,
          baseTokenSymbol: ctx.input.baseTokenSymbol,
          baseTokenName: ctx.input.baseTokenName,
          baseTokenAddress: ctx.input.baseTokenAddress,
          quoteTokenSymbol: ctx.input.quoteTokenSymbol,
          quoteTokenName: ctx.input.quoteTokenName,
          quoteTokenAddress: ctx.input.quoteTokenAddress,
          dexProtocol: ctx.input.dexProtocol,
          dexFamily: ctx.input.dexFamily,
          sideType: ctx.input.sideType,
          sideAmount: ctx.input.sideAmount,
          sideAmountInUsd: ctx.input.sideAmountInUsd,
          buyer: ctx.input.buyer,
          seller: ctx.input.seller
        }
      };
    }
  })
  .build();

let buildSolanaTradesQuery = (baseCurrency?: string, quoteCurrency?: string): string => {
  let whereFilters: string[] = [];
  if (baseCurrency) whereFilters.push('Currency: {MintAddress: {is: $baseCurrency}}');
  if (quoteCurrency)
    whereFilters.push('Side: {Currency: {MintAddress: {is: $quoteCurrency}}}');

  let tradeFilter = whereFilters.length > 0 ? `Trade: {${whereFilters.join(', ')}}` : '';
  let timeFilter = 'Block: {Time: {since: $since}}';
  let allFilters = [tradeFilter, timeFilter].filter(Boolean).join(', ');

  let varDefs: string[] = ['$limit: Int!', '$since: DateTime'];
  if (baseCurrency) varDefs.push('$baseCurrency: String');
  if (quoteCurrency) varDefs.push('$quoteCurrency: String');

  return `query PollSolanaTradesQuery(${varDefs.join(', ')}) {
  Solana(dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {${allFilters}}
    ) {
      Block { Time Slot }
      Transaction { Signature }
      Trade {
        Amount AmountInUSD Price PriceInUSD
        Currency { Symbol Name MintAddress }
        Dex { ProtocolName ProtocolFamily }
        Side {
          Type Amount AmountInUSD
          Currency { Symbol Name MintAddress }
        }
      }
    }
  }
}`;
};

let buildEvmTradesQuery = (
  baseCurrency?: string,
  quoteCurrency?: string,
  exchange?: string,
  apiVersion?: string
): string => {
  if (apiVersion === 'v1') {
    let filters: string[] = [
      'options: {limit: $limit, desc: "block.timestamp.iso8601"}',
      'date: {since: $since}'
    ];
    if (baseCurrency) filters.push('baseCurrency: {is: $baseCurrency}');
    if (quoteCurrency) filters.push('quoteCurrency: {is: $quoteCurrency}');
    if (exchange) filters.push('exchangeName: {is: $exchange}');

    let varDefs: string[] = [
      '$network: EthereumNetwork!',
      '$limit: Int!',
      '$since: ISO8601DateTime'
    ];
    if (baseCurrency) varDefs.push('$baseCurrency: String');
    if (quoteCurrency) varDefs.push('$quoteCurrency: String');
    if (exchange) varDefs.push('$exchange: String');

    return `query PollDEXTrades(${varDefs.join(', ')}) {
  ethereum(network: $network) {
    dexTrades(${filters.join(', ')}) {
      block { timestamp { iso8601 } height }
      transaction { hash }
      tradeAmount(in: USD)
      baseAmount
      baseCurrency { symbol name address }
      quoteCurrency { symbol name address }
      quotePrice
      exchange { fullName }
      side
    }
  }
}`;
  }

  // V2
  let whereFilters: string[] = [];
  if (baseCurrency) whereFilters.push('Currency: {SmartContract: {is: $baseCurrency}}');
  if (quoteCurrency)
    whereFilters.push('Side: {Currency: {SmartContract: {is: $quoteCurrency}}}');
  if (exchange) whereFilters.push('Dex: {ProtocolName: {is: $exchange}}');

  let tradeFilter = whereFilters.length > 0 ? `Trade: {${whereFilters.join(', ')}}` : '';
  let timeFilter = 'Block: {Time: {since: $since}}';
  let allFilters = [tradeFilter, timeFilter].filter(Boolean).join(', ');

  let varDefs: string[] = ['$network: evm_network!', '$limit: Int!', '$since: DateTime'];
  if (baseCurrency) varDefs.push('$baseCurrency: String');
  if (quoteCurrency) varDefs.push('$quoteCurrency: String');
  if (exchange) varDefs.push('$exchange: String');

  return `query PollDEXTrades(${varDefs.join(', ')}) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      limit: {count: $limit}
      orderBy: {descending: Block_Time}
      where: {${allFilters}}
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
        Buyer Seller
      }
    }
  }
}`;
};
