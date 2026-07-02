import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let createVoucher = SlateTool.create(spec, {
  name: 'Create Voucher',
  key: 'create_voucher',
  description: `Creates a new voucher (discount code) that customers can apply to reservations. Supports percentage or fixed-amount discounts, resource restrictions, and date limitations.`,
  instructions: [
    'discountValue can be a percentage (e.g. "20%") or a fixed amount (e.g. "50.00").',
    'Set uniqueCodes to generate numbered suffixes for individual tracking.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherCodePrefix: z
        .string()
        .describe('Voucher code (alphanumeric, dashes, underscores)'),
      discountValue: z
        .string()
        .describe('Discount: percentage (e.g. "20%") or fixed amount (e.g. "50.00")'),
      maxUses: z.number().describe('Maximum number of reservations that can use this voucher'),
      reservationStartTime: z.string().describe('First date the voucher becomes valid'),
      reservationEndTime: z.string().describe('Last date the voucher remains valid'),
      voucherTitle: z.string().optional().describe('Description of the voucher'),
      rentalStartTime: z
        .string()
        .optional()
        .describe('Restrict to rentals starting after this date'),
      rentalEndTime: z
        .string()
        .optional()
        .describe('Restrict to rentals ending before this date'),
      resourceIds: z
        .string()
        .optional()
        .describe('Comma-separated resource IDs to restrict the voucher to'),
      nonCombinable: z.boolean().optional().describe('Prevent combining with other vouchers'),
      isOnePerCustomer: z.boolean().optional().describe('Limit to one use per customer'),
      includeProducts: z
        .boolean()
        .optional()
        .describe('Apply percentage discount to additional products too'),
      uniqueCodes: z
        .string()
        .optional()
        .describe('Generate unique code suffixes (e.g. "1-100")')
    })
  )
  .output(
    z.object({
      voucherId: z.string().describe('ID of the created voucher'),
      codes: z
        .array(z.string())
        .optional()
        .describe('Generated unique codes (if uniqueCodes was specified)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let result = await client.createVoucher({
      quantity: ctx.input.maxUses,
      voucherCodePrefix: ctx.input.voucherCodePrefix,
      discountValue: ctx.input.discountValue,
      reservationStartTime: ctx.input.reservationStartTime,
      reservationEndTime: ctx.input.reservationEndTime,
      voucherTitle: ctx.input.voucherTitle,
      rentalStartTime: ctx.input.rentalStartTime,
      rentalEndTime: ctx.input.rentalEndTime,
      resources: ctx.input.resourceIds,
      nonCombinable: ctx.input.nonCombinable,
      isOnePerCustomer: ctx.input.isOnePerCustomer,
      includeProducts: ctx.input.includeProducts,
      uniqueCodes: ctx.input.uniqueCodes
    });

    return {
      output: {
        voucherId: String(result.new_voucher_id),
        codes: result.codes
      },
      message: `Voucher **"${ctx.input.voucherCodePrefix}"** created (ID: ${result.new_voucher_id}) with ${ctx.input.discountValue} discount, max ${ctx.input.maxUses} use(s).`
    };
  })
  .build();
