import { SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { invoiceSummaryOutputSchema, mapInvoiceSummary } from './shared';

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description:
    'Search Square invoices for a location, optionally narrowed to one customer. Square currently supports one location and optionally one customer in the invoice search filter.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe(
          'Location ID to search invoices in. Required unless query.filter.location_ids is provided.'
        ),
      customerId: z.string().optional().describe('Optional customer ID to filter invoices'),
      sortField: z
        .enum(['INVOICE_SORT_DATE'])
        .optional()
        .describe('Invoice sort field. Defaults to Square behavior when omitted'),
      sortOrder: z.enum(['ASC', 'DESC']).optional().describe('Invoice sort order'),
      query: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Advanced Square InvoiceQuery object. Convenience filter/sort fields are merged into this query.'
        ),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of invoices to return (max 200)')
    })
  )
  .output(
    z.object({
      invoices: z.array(invoiceSummaryOutputSchema),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.query?.filter?.location_ids && ctx.input.locationId) {
      throw squareServiceError(
        'Provide either locationId or query.filter.location_ids for search_invoices, not both.'
      );
    }
    if (!ctx.input.locationId && !ctx.input.query?.filter?.location_ids) {
      throw squareServiceError(
        'locationId is required unless query.filter.location_ids is provided.'
      );
    }

    let client = createClient(ctx.auth, ctx.config);
    let query: Record<string, any> = ctx.input.query ? { ...ctx.input.query } : {};
    let filter = { ...(query.filter ?? {}) };

    if (ctx.input.locationId) {
      filter.location_ids = [ctx.input.locationId];
    }

    if (ctx.input.customerId) {
      filter.customer_ids = [ctx.input.customerId];
    }

    query.filter = filter;
    if (ctx.input.sortField || ctx.input.sortOrder) {
      query.sort = {
        ...(query.sort ?? {}),
        field: ctx.input.sortField,
        order: ctx.input.sortOrder
      };
    }

    let result = await client.searchInvoices({
      query,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    let invoices = result.invoices.map(mapInvoiceSummary);

    return {
      output: { invoices, cursor: result.cursor },
      message: `Found **${invoices.length}** invoice(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
