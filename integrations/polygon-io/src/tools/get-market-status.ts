import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let exchangeStatusSchema = z.object({
  nasdaq: z.string().optional().describe('Nasdaq exchange status'),
  nyse: z.string().optional().describe('NYSE exchange status'),
  otc: z.string().optional().describe('OTC market status')
});

let currencyStatusSchema = z.object({
  fx: z.string().optional().describe('Forex market status'),
  crypto: z.string().optional().describe('Crypto market status')
});

let holidaySchema = z.object({
  exchange: z.string().optional().describe('Exchange name'),
  name: z.string().optional().describe('Holiday name'),
  date: z.string().optional().describe('Holiday date'),
  status: z.string().optional().describe('Market status on this holiday'),
  open: z.string().optional().describe('Opening time (if early close)'),
  close: z.string().optional().describe('Closing time (if early close)')
});

export let getMarketStatus = SlateTool.create(spec, {
  name: 'Get Market Status',
  key: 'get_market_status',
  description: `Check the current trading status of exchanges and financial markets, and retrieve upcoming market holidays. Shows whether markets are open, closed, in pre-market, or after-hours trading.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeHolidays: z
        .boolean()
        .optional()
        .default(false)
        .describe('Also fetch upcoming market holidays')
    })
  )
  .output(
    z.object({
      market: z
        .string()
        .optional()
        .describe('Overall market status (open, closed, extended-hours)'),
      earlyHours: z.boolean().optional().describe('Whether early trading hours are active'),
      afterHours: z.boolean().optional().describe('Whether after-hours trading is active'),
      serverTime: z.string().optional().describe('Server time'),
      exchanges: exchangeStatusSchema.optional().describe('Exchange-specific statuses'),
      currencies: currencyStatusSchema.optional().describe('Currency market statuses'),
      holidays: z.array(holidaySchema).optional().describe('Upcoming market holidays')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let status = await client.getMarketStatus();
    let holidays: any[] | undefined;

    if (ctx.input.includeHolidays) {
      holidays = await client.getMarketHolidays();
    }

    return {
      output: {
        market: status.market,
        earlyHours: status.earlyHours,
        afterHours: status.afterHours,
        serverTime: status.serverTime,
        exchanges: status.exchanges
          ? {
              nasdaq: status.exchanges.nasdaq,
              nyse: status.exchanges.nyse,
              otc: status.exchanges.otc
            }
          : undefined,
        currencies: status.currencies
          ? {
              fx: status.currencies.fx,
              crypto: status.currencies.crypto
            }
          : undefined,
        holidays: holidays?.map((h: any) => ({
          exchange: h.exchange,
          name: h.name,
          date: h.date,
          status: h.status,
          open: h.open,
          close: h.close
        }))
      },
      message: `Market is currently **${status.market || 'unknown'}**.${status.afterHours ? ' After-hours trading is active.' : ''}${status.earlyHours ? ' Early trading hours are active.' : ''}${holidays ? ` ${holidays.length} upcoming holiday(s).` : ''}`
    };
  })
  .build();
