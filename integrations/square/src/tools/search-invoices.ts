import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { squareServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { invoiceOutputSchema, mapInvoice } from './invoice-shared';

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description:
    'Search invoices at exactly one location and optionally one customer. Choose either convenience fields or query fields for each filter.',
  tags: { readOnly: true }
})
  .scopes(allOf('INVOICES_READ'))
  .input(
    z.object({
      locationId: z
        .string()
        .optional()
        .describe(
          'Location ID; discover with list_locations. Required unless query.filter.location_ids is given'
        ),
      customerId: z.string().optional(),
      sortField: z.enum(['INVOICE_SORT_DATE']).optional(),
      sortOrder: z.enum(['ASC', 'DESC']).optional(),
      query: z
        .object({
          filter: z
            .object({
              location_ids: z.array(z.string()).length(1).optional(),
              customer_ids: z.array(z.string()).length(1).optional()
            })
            .strict()
            .optional(),
          sort: z
            .object({
              field: z.enum(['INVOICE_SORT_DATE']).optional(),
              order: z.enum(['ASC', 'DESC']).optional()
            })
            .strict()
            .optional()
        })
        .strict()
        .optional()
        .describe('Square InvoiceQuery; specify one location and at most one customer'),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional()
    })
  )
  .output(z.object({ invoices: z.array(invoiceOutputSchema), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (
      (input.locationId && input.query?.filter?.location_ids) ||
      (input.customerId && input.query?.filter?.customer_ids)
    ) {
      throw squareServiceError(
        'Specify each invoice location or customer filter in either convenience fields or query.filter, not both.'
      );
    }
    if (
      (input.sortField && input.query?.sort?.field) ||
      (input.sortOrder && input.query?.sort?.order)
    ) {
      throw squareServiceError(
        'Specify each invoice sort option in either convenience fields or query.sort, not both.'
      );
    }
    let locationIds = input.locationId
      ? [input.locationId]
      : input.query?.filter?.location_ids;
    if (!locationIds?.length)
      throw squareServiceError('A locationId or query.filter.location_ids is required.');
    let query = {
      filter: {
        location_ids: locationIds,
        customer_ids: input.customerId ? [input.customerId] : input.query?.filter?.customer_ids
      },
      sort:
        input.sortField || input.sortOrder || input.query?.sort
          ? {
              field: input.sortField ?? input.query?.sort?.field,
              order: input.sortOrder ?? input.query?.sort?.order
            }
          : undefined
    };
    let result = await createClient(ctx.auth).searchInvoices({
      query,
      cursor: input.cursor,
      limit: input.limit
    });
    let invoices = result.invoices.map(mapInvoice);
    return {
      output: { invoices, cursor: result.cursor },
      message: `Found **${invoices.length}** invoice(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
