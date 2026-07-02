import { SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import { spec } from '../spec';

export let getMarketStatus = SlateTool.create(spec, {
  name: 'Get Market Status',
  key: 'get_market_status',
  description: `Retrieve the current trading status of major markets (stocks, forex, crypto) and upcoming market holidays. Shows whether markets are open, closed, in early trading, or late trading.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeHolidays: z
        .boolean()
        .optional()
        .describe('Whether to also return upcoming market holidays. Defaults to false.')
    })
  )
  .output(
    z.object({
      afterHours: z
        .boolean()
        .optional()
        .describe('Whether the market is in after-hours trading'),
      earlyHours: z
        .boolean()
        .optional()
        .describe('Whether the market is in early-hours trading'),
      market: z
        .string()
        .optional()
        .describe('Overall market status (open, closed, extended-hours)'),
      serverTime: z.string().optional().describe('Current server time'),
      exchanges: z
        .object({
          nyse: z.string().optional(),
          nasdaq: z.string().optional(),
          otc: z.string().optional()
        })
        .optional()
        .describe('Status of major stock exchanges'),
      currencies: z
        .object({
          fx: z.string().optional(),
          crypto: z.string().optional()
        })
        .optional()
        .describe('Status of currency markets'),
      holidays: z
        .array(
          z.object({
            exchange: z.string().optional().describe('Exchange name'),
            name: z.string().optional().describe('Holiday name'),
            date: z.string().optional().describe('Holiday date'),
            status: z.string().optional().describe('Market status on that day'),
            open: z.string().optional().describe('Market open time (if early close)'),
            close: z.string().optional().describe('Market close time (if early close)')
          })
        )
        .optional()
        .describe('Upcoming market holidays')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PolygonClient(ctx.auth.token);

    let statusResponse = await client.getMarketStatus();

    let output: any = {
      afterHours: statusResponse.afterHours,
      earlyHours: statusResponse.earlyHours,
      market: statusResponse.market,
      serverTime: statusResponse.serverTime,
      exchanges: statusResponse.exchanges
        ? {
            nyse: statusResponse.exchanges.nyse,
            nasdaq: statusResponse.exchanges.nasdaq,
            otc: statusResponse.exchanges.otc
          }
        : undefined,
      currencies: statusResponse.currencies
        ? {
            fx: statusResponse.currencies.fx,
            crypto: statusResponse.currencies.crypto
          }
        : undefined
    };

    if (ctx.input.includeHolidays) {
      let holidays = await client.getMarketHolidays();
      output.holidays = (Array.isArray(holidays) ? holidays : []).map((h: any) => ({
        exchange: h.exchange,
        name: h.name,
        date: h.date,
        status: h.status,
        open: h.open,
        close: h.close
      }));
    }

    return {
      output,
      message: `Market status: **${statusResponse.market || 'unknown'}**${statusResponse.afterHours ? ' (after hours)' : ''}${statusResponse.earlyHours ? ' (early hours)' : ''}.`
    };
  })
  .build();
