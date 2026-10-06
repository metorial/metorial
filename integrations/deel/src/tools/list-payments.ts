import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { dataObject, objectList, resourceSchema, validateOffset } from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listPayments = SlateTool.create(spec, {
  name: 'List Payments',
  key: 'list_payments',
  description: `Retrieve payment statements from Deel. Returns payment details including amounts, statuses, dates, and associated contracts.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('accounting:read'))
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe(
          'Legacy field; omit because payment receipt page size is provider-controlled'
        ),
      offset: z
        .number()
        .optional()
        .describe('Legacy first-page offset; use cursor for later pages'),
      cursor: z.string().optional().describe('nextCursor returned by the previous result'),
      dateFrom: z.string().optional().describe('Earliest payment date YYYY-MM-DD'),
      dateTo: z.string().optional().describe('Latest payment date YYYY-MM-DD')
    })
  )
  .output(
    z.object({
      payments: z.array(resourceSchema).describe('List of payment receipts'),
      nextCursor: z.string().nullable().optional(),
      hasMore: z.boolean().optional(),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateOffset(ctx.input.offset);
    if (
      (ctx.input.offset !== undefined && ctx.input.offset !== 0) ||
      ctx.input.limit !== undefined
    )
      throw createApiServiceError(
        'Payment receipts use provider-sized cursor pages. Omit limit and use cursor for later pages.'
      );
    let client = createClient(ctx);
    let data = dataObject(
      await client.listPayments({
        cursor: ctx.input.cursor,
        date_from: ctx.input.dateFrom,
        date_to: ctx.input.dateTo
      }),
      'payments'
    );
    let payments = objectList(data.rows, 'payments');
    let meta = z
      .object({
        next_cursor: z.string().nullable().optional(),
        has_more: z.boolean().optional(),
        total: z.number().optional()
      })
      .safeParse(data);
    if (!meta.success)
      throw createApiServiceError('Deel returned invalid payment pagination metadata.');

    return {
      output: {
        payments,
        nextCursor: meta.data.next_cursor,
        hasMore: meta.data.has_more,
        total: meta.data.total
      },
      message: `Found ${payments.length} payment(s).`
    };
  })
  .build();
