import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let listInvoices = SlateTool.create(spec, {
  name: 'List Invoices',
  key: 'list_invoices',
  description: `Retrieve invoices from Simplero with optional filtering by creation date range, payment date range, or invoice number range. Results can be sorted ascending or descending.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      createdAtFrom: z
        .string()
        .optional()
        .describe('Filter invoices created from this date (ISO 8601)'),
      createdAtTo: z
        .string()
        .optional()
        .describe('Filter invoices created up to this date (ISO 8601)'),
      paidAtFrom: z
        .string()
        .optional()
        .describe('Filter invoices paid from this date (ISO 8601)'),
      paidAtTo: z
        .string()
        .optional()
        .describe('Filter invoices paid up to this date (ISO 8601)'),
      invoiceNumberFrom: z
        .string()
        .optional()
        .describe('Starting invoice number for range filter'),
      invoiceNumberTo: z
        .string()
        .optional()
        .describe('Ending invoice number for range filter'),
      sortDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction by invoice number'),
      page: z.number().optional().describe('Page number (1-indexed)')
    })
  )
  .output(
    z.object({
      invoices: z.array(z.record(z.string(), z.unknown())).describe('List of invoice records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });

    let invoices = await client.listInvoices({
      createdAtFrom: ctx.input.createdAtFrom,
      createdAtTo: ctx.input.createdAtTo,
      paidAtFrom: ctx.input.paidAtFrom,
      paidAtTo: ctx.input.paidAtTo,
      invoiceNumberFrom: ctx.input.invoiceNumberFrom,
      invoiceNumberTo: ctx.input.invoiceNumberTo,
      dir: ctx.input.sortDirection,
      page: ctx.input.page
    });

    return {
      output: { invoices },
      message: `Retrieved **${invoices.length}** invoice(s).`
    };
  })
  .build();
