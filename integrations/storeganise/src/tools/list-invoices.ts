import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInvoicesTool = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve invoices from Storeganise. Filter by user, invoice state (draft, sent, paid, etc.), or updated timestamp. Supports pagination for large data sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().optional().describe('Filter invoices by user/tenant ID'),
      state: z
        .string()
        .optional()
        .describe('Filter by invoice state (e.g. "draft", "sent", "paid", "void")'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return invoices updated after this UTC timestamp'),
      limit: z.number().optional().describe('Maximum number of invoices to return'),
      offset: z.number().optional().describe('Number of invoices to skip for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.any())).describe('List of invoices')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let invoices = await client.listInvoices({
      userId: ctx.input.userId,
      state: ctx.input.state,
      updatedAfter: ctx.input.updatedAfter,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: { invoices },
      message: `Retrieved ${invoices.length} invoice(s)${ctx.input.state ? ` in **${ctx.input.state}** state` : ''}.`
    };
  })
  .build();
