import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorInput, cursorOutput, nextCursor, responseRows } from '../lib/response';
import { spec } from '../spec';

export let getAdjustedCorporateActions = SlateTool.create(spec, {
  name: 'Get Adjusted Corporate Actions',
  key: 'get_adjusted_corporate_actions',
  description:
    'Retrieve the current dividend or split dataset with event classifications and historical adjustment factors. Dividend records can include split-adjusted cash amounts. Use this for adjusting historical prices and analyzing corporate actions.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      dataType: z.enum(['dividends', 'splits']).describe('Corporate action dataset'),
      ticker: z
        .string()
        .optional()
        .describe('Stock ticker symbol; omit to query the entire dataset'),
      dateFrom: z
        .string()
        .optional()
        .describe(
          'Inclusive start date: ex-dividend date for dividends, execution date for splits'
        ),
      dateTo: z.string().optional().describe('Inclusive end date in YYYY-MM-DD format'),
      order: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Date sort order; defaults to descending'),
      limit: z.number().optional().describe('Maximum records per page, up to 5000'),
      cursor: cursorInput
    })
  )
  .output(
    z.object({
      records: z
        .array(z.unknown())
        .describe(
          'Original provider corporate-action records, preserving adjustment factors, event identifiers, and null values'
        ),
      count: z.number().describe('Number of records returned'),
      nextCursor: cursorOutput
    })
  )
  .handleInvocation(async ctx => {
    let data = await new Client({ token: ctx.auth.token }).getAdjustedCorporateActions(
      ctx.input.dataType,
      ctx.input
    );
    let records = responseRows(data.results, 'corporate actions');
    if (!records)
      throw createApiServiceError(
        'Polygon.io omitted the required corporate-action results array.'
      );
    let classification =
      ctx.input.dataType === 'dividends' ? 'distribution_type' : 'adjustment_type';
    for (let record of records)
      if (typeof record[classification] !== 'string')
        throw createApiServiceError(
          `Polygon.io omitted a required ${classification} classification.`
        );
    return {
      output: { records, count: records.length, nextCursor: nextCursor(data) },
      message: `Retrieved ${records.length} ${ctx.input.dataType} record(s).`
    };
  })
  .build();
