import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createVoucher = SlateTool.create(spec, {
  name: 'Create Voucher',
  key: 'create_voucher',
  description: `Create a new voucher in eTermin with a configurable code, monetary value, usage limit, and expiration date. Vouchers can be used for discounts, gift certificates, or appointment packages.`,
  instructions: ['Value is in cents (multiply by 100, e.g. 50.00 EUR = 5000).'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      voucherCode: z
        .string()
        .optional()
        .describe('Voucher code/ID. If omitted, one may be auto-generated.'),
      value: z.number().optional().describe('Monetary value in cents (e.g. 5000 for 50.00)'),
      currency: z.string().optional().describe('Currency code (e.g. EUR, USD, CHF)'),
      contingent: z.number().optional().describe('Number of allowed uses for this voucher'),
      validUntil: z
        .string()
        .optional()
        .describe('Expiration date for the voucher (yyyy-mm-dd format)')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the created voucher details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.createVoucher({
      voucherid: ctx.input.voucherCode,
      value: ctx.input.value,
      currency: ctx.input.currency,
      contingent: ctx.input.contingent,
      validuntil: ctx.input.validUntil
    });

    return {
      output: { result },
      message: `Voucher created${ctx.input.voucherCode ? ` with code **${ctx.input.voucherCode}**` : ''}.`
    };
  })
  .build();
