import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let browseCatalog = SlateTool.create(spec, {
  name: 'Browse Catalog with Cursor',
  key: 'browse_catalog',
  description:
    'Walk through large Best Buy product, store, or category result sets using cursor pagination. Returns the complete response with the nextCursorMark needed to continue.',
  instructions: [
    'Omit cursorMark or pass "*" for the first batch. Pass the returned nextCursorMark on the next call, keeping resource, query, keyword, show, sort, and pageSize unchanged.',
    'Stop when the returned resource array is empty. Cursor pagination is recommended for result sets longer than ten pages.',
    'For products, query can include itemUpdateDate and active=* to retrieve catalog changes. keyword is supported only for products.',
    'Use search_stores for nearby stores and check_availability for current in-stock locations.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resource: z.enum(['products', 'stores', 'categories']).describe('Catalog to browse'),
      cursorMark: z
        .string()
        .optional()
        .describe(
          '"*" for the first batch, or nextCursorMark returned by the preceding response'
        ),
      query: z
        .string()
        .optional()
        .describe(
          'Best Buy attribute filter expression, such as manufacturer=Apple or region=CA'
        ),
      keyword: z.string().optional().describe('Free-text search for products only'),
      show: z
        .string()
        .optional()
        .describe(
          'Comma-separated attributes to return; include resource identifiers for later calls'
        ),
      sort: z.string().optional().describe('Provider sort expression such as sku.asc'),
      pageSize: z
        .number()
        .optional()
        .describe('Results per batch, a whole number from 1 to 100')
    })
  )
  .output(
    z.object({
      response: z
        .record(z.string(), z.unknown())
        .describe(
          'Complete catalog response with products, stores, or categories and nextCursorMark'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });
    let response = await client.browseCatalog(ctx.input);
    return {
      output: { response },
      message: client.redactMessage(
        `Retrieved a ${ctx.input.resource} catalog batch. Use nextCursorMark to continue until the result array is empty.`
      )
    };
  })
  .build();
