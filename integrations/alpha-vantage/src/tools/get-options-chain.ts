import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { responseRows, responseText, validateDate } from '../lib/response';
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
  impliedVolatility: z
    .string()
    .optional()
    .describe('Implied volatility, returned with realtime Greeks and historical options'),
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
  constraints: [
    'Historical options require a premium API key. Realtime options require a qualifying premium plan. Implied volatility in realtime mode requires includeGreeks=true.'
  ],
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
      contract: z
        .string()
        .optional()
        .describe('Filter to a specific contract ID in either mode'),
      expiration: z
        .string()
        .optional()
        .describe('Filter by expiration date in YYYY-MM-DD format'),
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
      contracts: z.array(optionContractSchema).describe('Options contracts'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { symbol, mode, date, contract, includeGreeks } = ctx.input;

    validateDate(date, 'date');
    validateDate(ctx.input.expiration, 'expiration');
    if (date !== undefined && mode !== 'historical')
      throw createApiServiceError('date applies only to historical options.');
    if (date !== undefined && date <= '2008-01-01')
      throw createApiServiceError('Historical options date must be later than 2008-01-01.');
    if (
      mode === 'realtime' &&
      ctx.input.expiration &&
      ctx.input.expiration < new Date().toISOString().slice(0, 10)
    )
      throw createApiServiceError('Realtime expiration must be today or later.');
    let data: any;
    if (mode === 'historical') {
      data = await client.historicalOptions({
        symbol,
        date,
        contract,
        expiration: ctx.input.expiration
      });
    } else {
      data = await client.realtimeOptions({
        symbol,
        requireGreeks: includeGreeks,
        contract,
        expiration: ctx.input.expiration
      });
    }

    let rawContracts: any[] = responseRows(data.data, 'data');

    let contracts = rawContracts.map((c: any) => {
      let result: any = {
        contractId: responseText(c.contractID ?? c.contract_id, 'contractID'),
        symbol: c.symbol || symbol,
        expiration: responseText(c.expiration, 'expiration'),
        strike: responseText(c.strike, 'strike'),
        type: responseText(c.type, 'type'),
        lastPrice: responseText(c.last ?? c.last_price, 'last'),
        bid: responseText(c.bid, 'bid'),
        ask: responseText(c.ask, 'ask'),
        volume: responseText(c.volume, 'volume'),
        openInterest: responseText(c.open_interest, 'open_interest'),
        impliedVolatility:
          mode === 'realtime' && !includeGreeks && c.implied_volatility === undefined
            ? undefined
            : responseText(c.implied_volatility, 'implied_volatility')
      };

      if (includeGreeks || mode === 'historical') {
        if (c.delta !== undefined) result.delta = responseText(c.delta, 'delta');
        if (c.gamma !== undefined) result.gamma = responseText(c.gamma, 'gamma');
        if (c.theta !== undefined) result.theta = responseText(c.theta, 'theta');
        if (c.vega !== undefined) result.vega = responseText(c.vega, 'vega');
        if (c.rho !== undefined) result.rho = responseText(c.rho, 'rho');
      }

      return result;
    });

    return {
      output: { symbol, contracts, raw: data },
      message: `Retrieved ${contracts.length} options contract(s) for **${symbol}**.`
    };
  })
  .build();
