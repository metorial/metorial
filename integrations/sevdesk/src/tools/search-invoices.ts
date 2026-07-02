import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchInvoices = SlateTool.create(spec, {
  name: 'Search Invoices',
  key: 'search_invoices',
  description: `Search and list invoices in sevDesk. Filter by status, date range, contact, or invoice number. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['100', '200', '1000'])
        .optional()
        .describe('Filter by status: 100=Draft, 200=Open/Unpaid, 1000=Paid'),
      invoiceNumber: z.string().optional().describe('Filter by invoice number'),
      contactId: z.string().optional().describe('Filter by contact ID'),
      startDate: z.string().optional().describe('Filter invoices from this date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter invoices until this date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Max results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      invoices: z.array(
        z.object({
          invoiceId: z.string(),
          invoiceNumber: z.string().optional(),
          contactId: z.string().optional(),
          contactName: z.string().optional(),
          invoiceDate: z.string().optional(),
          status: z.string().optional(),
          totalNet: z.string().optional(),
          totalGross: z.string().optional(),
          currency: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number().describe('Number of invoices returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset,
      embed: 'contact'
    };
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.invoiceNumber) params.invoiceNumber = ctx.input.invoiceNumber;
    if (ctx.input.contactId) {
      params['contact[id]'] = ctx.input.contactId;
      params['contact[objectName]'] = 'Contact';
    }
    if (ctx.input.startDate) params.startDate = ctx.input.startDate;
    if (ctx.input.endDate) params.endDate = ctx.input.endDate;

    let results = await client.listInvoices(params);

    let invoices = (results ?? []).map((inv: any) => ({
      invoiceId: String(inv.id),
      invoiceNumber: inv.invoiceNumber ?? undefined,
      contactId: inv.contact?.id ? String(inv.contact.id) : undefined,
      contactName: inv.contact?.name || undefined,
      invoiceDate: inv.invoiceDate ?? undefined,
      status: inv.status != null ? String(inv.status) : undefined,
      totalNet: inv.sumNet ?? undefined,
      totalGross: inv.sumGross ?? undefined,
      currency: inv.currency ?? undefined,
      createdAt: inv.create ?? undefined
    }));

    return {
      output: {
        invoices,
        totalCount: invoices.length
      },
      message: `Found **${invoices.length}** invoice(s).`
    };
  })
  .build();
