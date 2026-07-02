import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAnalystRatings = SlateTool.create(spec, {
  name: 'Get Analyst Ratings',
  key: 'get_analyst_ratings',
  description: `Retrieve current and historical analyst buy/sell/hold ratings for stocks, including consensus data, price targets, and individual analyst recommendations. Supports up to 15+ years of history with date range filtering.`,
  constraints: ['Available on Business plan and higher'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      symbols: z.string().describe('Comma-separated ticker symbols (e.g. "AAPL,TSLA")'),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format'),
      limit: z.number().optional().describe('Number of results to return (max 1000)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      pagination: z.object({
        limit: z.number(),
        offset: z.number(),
        count: z.number(),
        total: z.number()
      }),
      ratings: z.array(
        z.object({
          symbol: z.string(),
          date: z.string(),
          analyst: z.string().nullable(),
          rating: z.string().nullable(),
          priceTarget: z.number().nullable(),
          consensusBuy: z.number().nullable(),
          consensusSell: z.number().nullable(),
          consensusHold: z.number().nullable()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getAnalystRatings({
      symbols: ctx.input.symbols,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let ratings = result.data.map(r => ({
      symbol: r.symbol,
      date: r.date,
      analyst: r.analyst,
      rating: r.rating,
      priceTarget: r.price_target,
      consensusBuy: r.consensus_buy,
      consensusSell: r.consensus_sell,
      consensusHold: r.consensus_hold
    }));

    return {
      output: {
        pagination: result.pagination,
        ratings
      },
      message: `Retrieved ${ratings.length} analyst ratings for **${ctx.input.symbols}**. Total available: ${result.pagination.total}.`
    };
  })
  .build();
