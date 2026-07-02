import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let optionContractSchema = z.object({
  contractId: z.string().describe('Unique contract identifier'),
  symbol: z.string().describe('Underlying ticker symbol'),
  expiration: z.string().describe('Expiration date'),
  strike: z.string().describe('Strike price'),
  type: z.string().describe('Option type: call or put'),
  lastPrice: z.string().describe('Last traded price'),
  bid: z.string().describe('Bid price'),
  ask: z.string().describe('Ask price'),
  volume: z.string().describe('Trading volume'),
  openInterest: z.string().describe('Open interest'),
  impliedVolatility: z.string().describe('Implied volatility'),
  delta: z.string().optional().describe('Delta greek'),
  gamma: z.string().optional().describe('Gamma greek'),
  theta: z.string().optional().describe('Theta greek'),
  vega: z.string().optional().describe('Vega greek'),
  rho: z.string().optional().describe('Rho greek')
});

export let getOptionsChain = SlateTool.create(spec, {
  name: 'Get Options Chain',
  key: 'get_options_chain',
  description: `Retrieve current or historical options chain data for a US-listed equity. Returns calls and puts with strike prices, premiums, volume, open interest, implied volatility, and optionally Greeks (delta, gamma, theta, vega, rho).`,
  constraints: ['Historical options data may require a premium API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Underlying stock ticker symbol, e.g. "AAPL"'),
      mode: z
        .enum(['realtime', 'historical'])
        .optional()
        .default('realtime')
        .describe('Whether to get current or historical options data'),
      date: z
        .string()
        .optional()
        .describe('Specific date for historical options data in YYYY-MM-DD format'),
      contract: z.string().optional().describe('Filter to a specific contract ID'),
      includeGreeks: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include Greeks in the response (realtime only)')
    })
  )
  .output(
    z.object({
      symbol: z.string().describe('Underlying ticker symbol'),
      contracts: z.array(optionContractSchema).describe('Options contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, mode, date, contract, includeGreeks } = ctx.input;

    let data: any;
    if (mode === 'historical') {
      data = await client.historicalOptions({ symbol, date });
    } else {
      data = await client.realtimeOptions({ symbol, requireGreeks: includeGreeks, contract });
    }

    let rawContracts: any[] = data.data || [];

    let contracts = rawContracts.map((c: any) => {
      let result: any = {
        contractId: c.contractID || c.contract_id || '',
        symbol: c.symbol || symbol,
        expiration: c.expiration || '',
        strike: c.strike || '',
        type: c.type || '',
        lastPrice: c.last || c.last_price || '',
        bid: c.bid || '',
        ask: c.ask || '',
        volume: c.volume || '',
        openInterest: c.open_interest || '',
        impliedVolatility: c.implied_volatility || ''
      };

      if (includeGreeks || mode === 'historical') {
        result.delta = c.delta || '';
        result.gamma = c.gamma || '';
        result.theta = c.theta || '';
        result.vega = c.vega || '';
        result.rho = c.rho || '';
      }

      return result;
    });

    return {
      output: { symbol, contracts },
      message: `Retrieved ${contracts.length} options contract(s) for **${symbol}**.`
    };
  })
  .build();
