import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let listVouchers = SlateTool.create(spec, {
  name: 'List Vouchers',
  key: 'list_vouchers',
  description: `Lists vouchers with optional filtering by rental dates, resource, and code prefix. Returns voucher details including usage counts and discount values.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      rentalStartTime: z.string().optional().describe('Filter by rental start date'),
      rentalEndTime: z.string().optional().describe('Filter by rental end date'),
      resourceId: z.string().optional().describe('Filter by resource ID'),
      voucherCodePrefix: z.string().optional().describe('Filter by voucher code prefix')
    })
  )
  .output(
    z.object({
      vouchers: z
        .array(
          z.object({
            voucherId: z.string().describe('Voucher ID'),
            code: z.string().optional().describe('Voucher code'),
            title: z.string().optional().describe('Voucher title'),
            discountValue: z.string().optional().describe('Discount amount or percentage'),
            maxUses: z.number().optional().describe('Maximum uses allowed'),
            usesConsumed: z.number().optional().describe('Number of uses consumed'),
            reservationStartDate: z.string().optional().describe('Voucher valid from'),
            reservationEndDate: z.string().optional().describe('Voucher valid until'),
            resources: z.string().optional().describe('Restricted resource IDs'),
            nonCombinable: z.boolean().optional().describe('Whether non-combinable')
          })
        )
        .describe('List of vouchers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.listVouchers({
      rentalStartTime: ctx.input.rentalStartTime,
      rentalEndTime: ctx.input.rentalEndTime,
      resourceId: ctx.input.resourceId,
      voucherCodePrefix: ctx.input.voucherCodePrefix
    });

    let results = result?.results || result || [];
    let vouchers = (Array.isArray(results) ? results : []).map((v: any) => ({
      voucherId: String(v.voucher_id),
      code: v.code,
      title: v.voucher_title,
      discountValue: v.discount_value ? String(v.discount_value) : undefined,
      maxUses: v.quantity != null ? Number(v.quantity) : undefined,
      usesConsumed: v.quantity_used != null ? Number(v.quantity_used) : undefined,
      reservationStartDate: v.reservation_start_date,
      reservationEndDate: v.reservation_end_date,
      resources: v.resources,
      nonCombinable: v.non_combinable != null ? Boolean(v.non_combinable) : undefined
    }));

    return {
      output: {
        vouchers
      },
      message: `Found **${vouchers.length}** voucher(s).`
    };
  })
  .build();
