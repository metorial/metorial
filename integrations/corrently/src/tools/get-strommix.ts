import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getStrommix = SlateTool.create(spec, {
  name: 'Electricity Mix',
  key: 'get_strommix',
  description: `Provides data on Germany's electricity generation mix across renewable and non-renewable sources. Includes breakdowns by source type (biomass, solar, wind onshore/offshore, nuclear, fossil fuels, etc.) for a given time period. Useful for analyzing energy production trends and renewable energy adoption.`,
  instructions: [
    'Use predefined periods like "lastmonth" or "last7days", or specify custom date ranges with from/to parameters.',
    'If no period is specified, the API returns the latest available data.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      period: z
        .string()
        .optional()
        .describe(
          'Predefined time period, yeartodate, thismonth, lastmonth, last30days, last7days, last90days, lastyear, or last365days; legacy last_month/last_7_days also accepted'
        ),
      from: z
        .string()
        .optional()
        .describe('Custom range start date (ISO format, e.g. "2024-01-01")'),
      to: z
        .string()
        .optional()
        .describe('Custom range end date (ISO format, e.g. "2024-01-31")')
    })
  )
  .output(
    z.object({
      raw: z.unknown().describe('Complete provider response'),
      mix: z
        .record(z.string(), z.any())
        .optional()
        .describe('Energy generation mix by source type with production volumes'),
      total: z.number().optional().describe('Total energy production in the period')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getStrommix({
      period: ctx.input.period,
      from: ctx.input.from,
      to: ctx.input.to
    });

    return {
      output: {
        raw: result,
        mix: Array.isArray(result.mix)
          ? Object.fromEntries(result.mix.map(entry => [entry.type, entry]))
          : result.mix,
        total: result.total
      },
      message: `Retrieved Germany's electricity generation mix${ctx.input.period ? ` for period **${ctx.input.period}**` : ''}.`
    };
  })
  .build();
