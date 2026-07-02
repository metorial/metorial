import { SlateTool } from 'slates';
import { z } from 'zod';
import { BitqueryClient } from '../lib/client';
import { spec } from '../spec';

let ohlcCandleSchema = z.object({
  time: z.string().describe('Candle timestamp'),
  open: z.number().optional().describe('Opening price'),
  high: z.number().optional().describe('Highest price'),
  low: z.number().optional().describe('Lowest price'),
  close: z.number().optional().describe('Closing price'),
  volume: z.number().optional().describe('Volume in USD'),
  tradeCount: z.number().optional().describe('Number of trades in the interval')
});

export let getTokenPrice = SlateTool.create(spec, {
  name: 'Get Token Price',
  key: 'get_token_price',
  description: `Retrieve token price and OHLC (Open, High, Low, Close) candle data from DEX trades. Returns aggregated price data for a token pair over specified time intervals.
Useful for charting, price analysis, and building trading dashboards. Supports EVM chains and Solana.`,
  instructions: [
    'Both baseCurrency and quoteCurrency are required to define the trading pair.',
    'Common quote currencies: WETH (0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2), USDT (0xdAC17F958D2ee523a2206206994597C13D831ec7), USDC (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) on Ethereum.',
    'For Solana, use WSOL (So11111111111111111111111111111111111111112) or USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) as quote.'
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
      baseCurrency: z.string().describe('Base token contract/mint address'),
      quoteCurrency: z.string().describe('Quote token contract/mint address'),
      since: z
        .string()
        .describe('Start datetime (ISO 8601 format, e.g., "2024-01-01T00:00:00Z")'),
      till: z.string().describe('End datetime (ISO 8601 format)'),
      intervalMinutes: z
        .number()
        .min(1)
        .max(1440)
        .default(60)
        .describe('Candle interval in minutes (1, 5, 15, 60, 240, 1440)')
    })
  )
  .output(
    z.object({
      candles: z.array(ohlcCandleSchema).describe('OHLC candle data'),
      candleCount: z.number().describe('Number of candles returned'),
      baseCurrency: z.string().describe('Base token address'),
      quoteCurrency: z.string().describe('Quote token address')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BitqueryClient({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion as 'v1' | 'v2'
    });

    let { blockchain, baseCurrency, quoteCurrency, since, till, intervalMinutes } = ctx.input;
    ctx.info(`Fetching OHLC data for token pair on ${blockchain}`);

    let candles: z.infer<typeof ohlcCandleSchema>[] = [];

    if (blockchain === 'solana') {
      let query = `query GetSolanaOHLC($baseCurrency: String!, $quoteCurrency: String!, $since: DateTime!, $till: DateTime!, $interval: Int!) {
  Solana(dataset: combined) {
    DEXTradeByTokens(
      orderBy: {ascendingByField: "Block_Time"}
      where: {
        Trade: {
          Amount: {gt: "0"}
          Currency: {MintAddress: {is: $baseCurrency}}
          Side: {Currency: {MintAddress: {is: $quoteCurrency}}}
        }
        Block: {Time: {since: $since, till: $till}}
        Transaction: {Result: {Success: true}}
      }
    ) {
      Block {
        Time(interval: {count: $interval, in: minutes})
      }
      high: Trade_Price: Trade_Price(maximum: Trade_Price)
      low: Trade_Price: Trade_Price(minimum: Trade_Price)
      open: Trade_Price: Trade_Price(minimum: Block_Slot)
      close: Trade_Price: Trade_Price(maximum: Block_Slot)
      volume: sum(of: Trade_Side_AmountInUSD)
      tradeCount: count
    }
  }
}`;

      let data = await client.query(query, {
        baseCurrency,
        quoteCurrency,
        since,
        till,
        interval: intervalMinutes
      });

      let raw = data?.Solana?.DEXTradeByTokens || [];

      candles = raw.map((c: any) => ({
        time: c.Block?.Time || '',
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        tradeCount: c.tradeCount
      }));
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

      let query = `query GetOHLC($network: EthereumNetwork!, $baseCurrency: String!, $quoteCurrency: String!, $since: ISO8601DateTime!, $till: ISO8601DateTime!, $interval: Int!) {
  ethereum(network: $network) {
    dexTrades(
      options: {asc: "timeInterval.minute"}
      date: {since: $since, till: $till}
      baseCurrency: {is: $baseCurrency}
      quoteCurrency: {is: $quoteCurrency}
    ) {
      timeInterval {
        minute(count: $interval)
      }
      high: quotePrice(calculate: maximum)
      low: quotePrice(calculate: minimum)
      open: minimum(of: block, get: quote_price)
      close: maximum(of: block, get: quote_price)
      volume: tradeAmount(in: USD)
      tradeCount: count
    }
  }
}`;

      let data = await client.query(query, {
        network: networkMap[blockchain] || blockchain,
        baseCurrency,
        quoteCurrency,
        since,
        till,
        interval: intervalMinutes
      });

      let raw = data?.ethereum?.dexTrades || [];

      candles = raw.map((c: any) => ({
        time: c.timeInterval?.minute || '',
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        tradeCount: c.tradeCount
      }));
    } else {
      let query = `query GetOHLC($network: evm_network!, $baseCurrency: String!, $quoteCurrency: String!, $since: DateTime!, $till: DateTime!, $interval: Int!) {
  EVM(network: $network, dataset: combined) {
    DEXTradeByTokens(
      orderBy: {ascendingByField: "Block_Time"}
      where: {
        Trade: {
          Amount: {gt: "0"}
          Currency: {SmartContract: {is: $baseCurrency}}
          Side: {Currency: {SmartContract: {is: $quoteCurrency}}}
        }
        Block: {Time: {since: $since, till: $till}}
      }
    ) {
      Block {
        Time(interval: {count: $interval, in: minutes})
      }
      high: Trade_Price: Trade_Price(maximum: Trade_Price)
      low: Trade_Price: Trade_Price(minimum: Trade_Price)
      open: Trade_Price: Trade_Price(minimum: Block_Number)
      close: Trade_Price: Trade_Price(maximum: Block_Number)
      volume: sum(of: Trade_Side_AmountInUSD)
      tradeCount: count
    }
  }
}`;

      let data = await client.query(query, {
        network: blockchain,
        baseCurrency,
        quoteCurrency,
        since,
        till,
        interval: intervalMinutes
      });

      let raw = data?.EVM?.DEXTradeByTokens || [];

      candles = raw.map((c: any) => ({
        time: c.Block?.Time || '',
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        tradeCount: c.tradeCount
      }));
    }

    return {
      output: {
        candles,
        candleCount: candles.length,
        baseCurrency,
        quoteCurrency
      },
      message: `Retrieved **${candles.length}** OHLC candle(s) for the token pair on **${blockchain}** with **${intervalMinutes}-minute** intervals.`
    };
  })
  .build();
