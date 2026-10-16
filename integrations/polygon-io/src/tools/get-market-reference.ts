import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cursorInput, cursorOutput, nextCursor, responseRows } from '../lib/response';
import { spec } from '../spec';

export let getMarketReference = SlateTool.create(spec, {
  name: 'Get Market Reference',
  key: 'get_market_reference',
  description:
    'Discover supported ticker type codes, exchange identifiers and MICs, or trade and quote condition codes. Use these records to interpret market data and choose filters for search_tickers.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      cursor: cursorInput,
      resource: z
        .enum(['ticker_types', 'exchanges', 'conditions'])
        .describe('Reference dataset to retrieve'),
      assetClass: z
        .enum(['stocks', 'options', 'fx', 'crypto', 'indices'])
        .optional()
        .describe('Filter by asset class; availability depends on the reference dataset'),
      locale: z
        .enum(['us', 'global'])
        .optional()
        .describe('Locale filter for ticker types and exchanges'),
      dataType: z
        .enum(['trade', 'bbo', 'nbbo'])
        .optional()
        .describe('Condition codes only: type of market data'),
      sip: z
        .string()
        .optional()
        .describe('Condition codes only: SIP such as CTA, UTP, or OPRA'),
      limit: z
        .number()
        .optional()
        .describe('Condition codes only: maximum records, up to 1000')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.unknown())
        .optional()
        .describe(
          'Original provider reference records, including identifiers and descriptions'
        ),
      count: z.number().optional().describe('Number of records returned'),
      nextCursor: cursorOutput
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    if (
      ctx.input.resource !== 'conditions' &&
      (ctx.input.dataType !== undefined ||
        ctx.input.sip !== undefined ||
        ctx.input.limit !== undefined ||
        ctx.input.cursor !== undefined)
    )
      throw createApiServiceError(
        'Use dataType, sip, limit, and cursor only with condition codes.'
      );
    if (ctx.input.resource === 'conditions' && ctx.input.locale !== undefined)
      throw createApiServiceError('The condition-code endpoint does not support locale.');
    if (ctx.input.assetClass === 'indices' && ctx.input.resource !== 'ticker_types')
      throw createApiServiceError(
        'The exchange and condition datasets do not support the indices asset class.'
      );
    let data =
      ctx.input.resource === 'ticker_types'
        ? await client.getTickerTypes(ctx.input)
        : ctx.input.resource === 'exchanges'
          ? await client.getExchanges(ctx.input)
          : await client.getConditions(ctx.input);
    let records = responseRows(data.results, 'reference records');
    if (ctx.input.resource === 'conditions' && !records)
      throw createApiServiceError(
        'Polygon.io omitted the required condition-code results array.'
      );
    for (let record of records ?? []) {
      let valid =
        ctx.input.resource === 'ticker_types'
          ? typeof record.code === 'string' && typeof record.description === 'string'
          : typeof record.id === 'number' && typeof record.name === 'string';
      if (!valid)
        throw createApiServiceError(
          'Polygon.io returned a reference record without its required identifier and description.'
        );
    }
    return {
      output: { records, count: records?.length, nextCursor: nextCursor(data) },
      message: `Retrieved ${records?.length ?? 0} ${ctx.input.resource} reference record(s).`
    };
  })
  .build();
