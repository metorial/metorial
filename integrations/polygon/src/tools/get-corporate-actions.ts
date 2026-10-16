import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PolygonClient } from '../lib/client';
import {
  polygonCursor,
  polygonRawOutput,
  polygonRecords,
  polygonResponseFields
} from '../lib/response';
import { spec } from '../spec';

export let getCorporateActions = SlateTool.create(spec, {
  name: 'Get Corporate Actions',
  key: 'get_corporate_actions',
  description:
    'Retrieve stock splits or cash dividends from the current corporate actions API, including event identifiers, distribution classifications, and historical adjustment factors.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataType: z.enum(['splits', 'dividends']),
      ticker: z
        .string()
        .optional()
        .describe('Stock ticker. Use search_tickers to discover symbols.'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Earliest execution date for splits or ex-dividend date for dividends, YYYY-MM-DD.'
        ),
      dateTo: z
        .string()
        .optional()
        .describe(
          'Latest execution date for splits or ex-dividend date for dividends, YYYY-MM-DD.'
        ),
      adjustmentType: z
        .enum(['forward_split', 'reverse_split', 'stock_dividend'])
        .optional()
        .describe('Splits only.'),
      distributionType: z
        .enum(['recurring', 'special', 'supplemental', 'irregular', 'unknown'])
        .optional()
        .describe('Dividends only.'),
      frequency: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Expected annual payment frequency. Dividends only; 0 means irregular.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(5000)
        .optional()
        .describe('Page size; provider default is 100.'),
      sort: z
        .string()
        .optional()
        .describe(
          'Columns with .asc or .desc, e.g. execution_date.desc for splits or ex_dividend_date.desc for dividends.'
        ),
      cursor: polygonCursor
    })
  )
  .output(
    z.object({
      ...polygonResponseFields,
      actions: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Complete corporate action records with identifiers, dates, amounts or split ratios, and adjustment factors.'
        )
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.dataType === 'splits' &&
      (ctx.input.distributionType !== undefined || ctx.input.frequency !== undefined)
    ) {
      throw createApiServiceError('distributionType and frequency apply only to dividends.');
    }
    if (ctx.input.dataType === 'dividends' && ctx.input.adjustmentType !== undefined) {
      throw createApiServiceError('adjustmentType applies only to splits.');
    }
    let client = new PolygonClient(ctx.auth.token);
    let response = await client.getCorporateActions(ctx.input.dataType, ctx.input);
    let actions = polygonRecords(response.results, 'results', true);
    return {
      output: polygonRawOutput({ actions }, response),
      message: `Retrieved ${actions.length} ${ctx.input.dataType} records.`
    };
  })
  .build();
