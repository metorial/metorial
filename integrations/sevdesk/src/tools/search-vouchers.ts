import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let searchVouchers = SlateTool.create(spec, {
  name: 'Search Vouchers',
  key: 'search_vouchers',
  description: `Search and list vouchers (incoming invoices/receipts) in sevDesk. Filter by status, supplier, or date range. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['50', '100', '1000'])
        .optional()
        .describe('Filter by status: 50=Draft, 100=Unpaid, 1000=Paid'),
      supplierContactId: z.string().optional().describe('Filter by supplier contact ID'),
      startDate: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      endDate: z.string().optional().describe('Filter until date (YYYY-MM-DD)'),
      limit: z.number().optional().describe('Max results (default: 100, max: 1000)'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      vouchers: z.array(
        z.object({
          voucherId: z.string(),
          voucherNumber: z.string().optional(),
          description: z.string().optional(),
          voucherDate: z.string().optional(),
          status: z.string().optional(),
          totalNet: z.string().optional(),
          totalGross: z.string().optional(),
          supplierContactId: z.string().optional(),
          creditDebit: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      totalCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let params: Record<string, any> = {
      limit: ctx.input.limit ?? 100,
      offset: ctx.input.offset
    };
    if (ctx.input.status) params.status = ctx.input.status;
    if (ctx.input.supplierContactId) {
      params['supplier[id]'] = ctx.input.supplierContactId;
      params['supplier[objectName]'] = 'Contact';
    }
    if (ctx.input.startDate) params.startDate = ctx.input.startDate;
    if (ctx.input.endDate) params.endDate = ctx.input.endDate;

    let results = await client.listVouchers(params);

    let vouchers = (results ?? []).map((v: any) => ({
      voucherId: String(v.id),
      voucherNumber: v.voucherNumber ?? undefined,
      description: v.description ?? undefined,
      voucherDate: v.voucherDate ?? undefined,
      status: v.status != null ? String(v.status) : undefined,
      totalNet: v.sumNet ?? undefined,
      totalGross: v.sumGross ?? undefined,
      supplierContactId: v.supplier?.id ? String(v.supplier.id) : undefined,
      creditDebit: v.creditDebit ?? undefined,
      createdAt: v.create ?? undefined
    }));

    return {
      output: {
        vouchers,
        totalCount: vouchers.length
      },
      message: `Found **${vouchers.length}** voucher(s).`
    };
  })
  .build();
