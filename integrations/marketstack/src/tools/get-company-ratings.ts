import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, record } from '../lib/client';
import { spec } from '../spec';

export let getCompanyRatings = SlateTool.create(spec, {
  key: 'get_company_ratings',
  name: 'Get Company Analyst Ratings',
  description:
    'Retrieve analyst buy/sell/hold ratings and consensus price targets for exactly one company ticker through the current company-ratings API. Returns the provider company metadata, consensus, individual rating records, and complete response.',
  instructions: [
    'Supply one ticker per invocation. The provider allows one company-ratings request per minute; space separate invocations accordingly.'
  ],
  constraints: [
    'Available on Business plans and higher.',
    'One provider API request per invocation. The provider limits this endpoint to one API call per minute.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ticker: z
        .string()
        .describe(
          'Exactly one stock ticker symbol, for example AAPL. Comma-separated lists are not supported by this tool.'
        ),
      dateFrom: z.string().optional().describe('Start date in YYYY-MM-DD format.'),
      dateTo: z.string().optional().describe('End date in YYYY-MM-DD format.'),
      rated: z
        .enum(['buy', 'sell', 'hold'])
        .optional()
        .describe('Filter by the analyst rating.')
    })
  )
  .output(
    z.object({
      company: z.record(z.string(), z.unknown()).optional(),
      consensus: z.record(z.string(), z.unknown()).optional(),
      ratings: z.array(z.record(z.string(), z.unknown())).optional(),
      raw: z.unknown().optional()
    })
  )
  .handleInvocation(async ctx => {
    let raw = await new Client(ctx.auth).getCompanyRatings(ctx.input);
    let result = record(record(raw).result);
    let output = record(result.output);
    return {
      output: {
        company:
          typeof result.basics === 'object' && result.basics !== null
            ? record(result.basics)
            : undefined,
        consensus:
          typeof output.analyst_consensus === 'object' && output.analyst_consensus !== null
            ? record(output.analyst_consensus)
            : undefined,
        ratings: Array.isArray(output.analysts) ? output.analysts : undefined,
        raw
      },
      message: `Retrieved company analyst ratings for ${ctx.input.ticker}.`
    };
  })
  .build();
