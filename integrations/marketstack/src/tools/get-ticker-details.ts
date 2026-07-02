import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTickerDetails = SlateTool.create(spec, {
  name: 'Get Ticker Details',
  key: 'get_ticker_details',
  description: `Retrieve detailed company information for a specific ticker symbol, including company name, country, exchange details, and data availability. Useful for looking up metadata about a particular stock.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbol: z.string().describe('Ticker symbol (e.g. "AAPL")')
    })
  )
  .output(
    z.object({
      symbol: z.string(),
      name: z.string(),
      country: z.string().nullable(),
      hasIntraday: z.boolean(),
      hasEod: z.boolean(),
      exchange: z.object({
        name: z.string(),
        acronym: z.string(),
        mic: z.string(),
        country: z.string(),
        countryCode: z.string(),
        city: z.string(),
        website: z.string()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTickerInfo(ctx.input.symbol);
    let t = result.data;

    return {
      output: {
        symbol: t.symbol,
        name: t.name,
        country: t.country,
        hasIntraday: t.has_intraday,
        hasEod: t.has_eod,
        exchange: {
          name: t.stock_exchange.name,
          acronym: t.stock_exchange.acronym,
          mic: t.stock_exchange.mic,
          country: t.stock_exchange.country,
          countryCode: t.stock_exchange.country_code,
          city: t.stock_exchange.city,
          website: t.stock_exchange.website
        }
      },
      message: `Retrieved details for **${t.name}** (${t.symbol}) traded on ${t.stock_exchange.name}.`
    };
  })
  .build();
