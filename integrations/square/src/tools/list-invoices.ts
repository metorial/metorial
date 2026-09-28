import { allOf, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';
import { invoiceOutputSchema, mapInvoice } from './invoice-shared';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description:
    'List invoices at one location with status, version, recipient, payment requests, and public URL when available.',
  tags: { readOnly: true }
})
  .scopes(allOf('INVOICES_READ'))
  .input(
    z.object({
      locationId: z.string().describe('Location ID; discover with list_locations'),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional()
    })
  )
  .output(z.object({ invoices: z.array(invoiceOutputSchema), cursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    let result = await createClient(ctx.auth).listInvoices(ctx.input.locationId, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    let invoices = result.invoices.map(mapInvoice);
    return {
      output: { invoices, cursor: result.cursor },
      message: `Found **${invoices.length}** invoice(s).${result.cursor ? ' More results available.' : ''}`
    };
  })
  .build();
