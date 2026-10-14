import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getVoucher = SlateTool.create(spec, {
  name: 'Get Voucher',
  key: 'get_voucher',
  description: 'Retrieve a voucher by ID with supplier, tax, payment, and amount details.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      voucherId: z
        .string()
        .min(1)
        .describe('Voucher ID. Use search_vouchers to find vouchers.')
    })
  )
  .output(
    z.object({
      voucherId: z.string(),
      voucher: z
        .any()
        .describe(
          'Voucher details, including supplier, status, dates, amounts, and tax information.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });
    let voucher = await client.getVoucher(ctx.input.voucherId, { embed: 'supplier' });
    if (voucher?.id == null) {
      throw createApiServiceError('sevDesk did not return the requested voucher.');
    }
    return {
      output: { voucherId: String(voucher.id), voucher },
      message: `Retrieved voucher **${voucher.voucherNumber ?? voucher.id}**.`
    };
  })
  .build();
