import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

let voucherPositionSchema = z
  .object({
    accountingTypeId: z.string().describe('Booking account ID'),
    taxRate: z.number().describe('Tax rate percentage (e.g. 19)'),
    net: z.boolean().optional().describe('Whether the amount is net (true) or gross (false)'),
    sumNet: z.number().optional().describe('Net amount for this position'),
    sumGross: z.number().optional().describe('Gross amount for this position'),
    comment: z.string().optional().describe('Comment for this position')
  })
  .describe('Voucher position/line item');

export let createVoucher = SlateTool.create(spec, {
  name: 'Create Voucher',
  key: 'create_voucher',
  description: `Create a new voucher (incoming invoice/receipt) in sevDesk using the Factory endpoint. Vouchers represent expenses and incoming bills.`,
  instructions: [
    'Use the Receipt Guidance tool to find valid booking account and tax rule combinations.',
    'Vouchers must comply with GoBD requirements once enshrined.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherDate: z.string().describe('Voucher date in YYYY-MM-DD format'),
      supplierContactId: z.string().optional().describe('Supplier contact ID'),
      description: z.string().optional().describe('Voucher description'),
      payDate: z.string().optional().describe('Payment date in YYYY-MM-DD format'),
      status: z.number().optional().describe('Status: 50=Draft, 100=Unpaid, 1000=Paid'),
      creditDebit: z
        .enum(['C', 'D'])
        .optional()
        .describe('C=Credit (incoming), D=Debit (outgoing)'),
      voucherType: z
        .enum(['VOU', 'RV'])
        .optional()
        .describe('VOU=Voucher (default), RV=Recurring voucher'),
      currency: z.string().optional().describe('Currency code (default: EUR)'),
      taxRuleId: z.string().optional().describe('Tax rule ID (for sevDesk 2.0)'),
      positions: z.array(voucherPositionSchema).describe('Voucher positions/line items')
    })
  )
  .output(
    z.object({
      voucherId: z.string().describe('ID of the created voucher'),
      voucherNumber: z.string().optional().describe('Voucher number'),
      totalNet: z.string().optional().describe('Net total'),
      totalGross: z.string().optional().describe('Gross total'),
      status: z.string().optional().describe('Voucher status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let voucherData: Record<string, any> = {
      objectName: 'Voucher',
      voucherDate: ctx.input.voucherDate,
      status: ctx.input.status ?? 50,
      creditDebit: ctx.input.creditDebit ?? 'C',
      voucherType: ctx.input.voucherType ?? 'VOU',
      currency: ctx.input.currency ?? 'EUR',
      mapAll: true
    };

    if (ctx.input.supplierContactId) {
      voucherData.supplier = { id: ctx.input.supplierContactId, objectName: 'Contact' };
    }
    if (ctx.input.description) voucherData.description = ctx.input.description;
    if (ctx.input.payDate) voucherData.payDate = ctx.input.payDate;
    if (ctx.input.taxRuleId) {
      voucherData.taxRule = { id: ctx.input.taxRuleId, objectName: 'TaxRule' };
    }

    let positions = ctx.input.positions.map(pos => {
      let posData: Record<string, any> = {
        objectName: 'VoucherPos',
        mapAll: true,
        accountingType: { id: pos.accountingTypeId, objectName: 'AccountingType' },
        taxRate: pos.taxRate,
        net: pos.net ?? true
      };
      if (pos.sumNet !== undefined) posData.sumNet = pos.sumNet;
      if (pos.sumGross !== undefined) posData.sumGross = pos.sumGross;
      if (pos.comment) posData.comment = pos.comment;
      return posData;
    });

    let result = await client.createVoucher({
      voucher: voucherData,
      voucherPosSave: positions
    });

    let voucher = result?.voucher ?? result;

    return {
      output: {
        voucherId: String(voucher.id),
        voucherNumber: voucher.voucherNumber ?? undefined,
        totalNet: voucher.sumNet ?? undefined,
        totalGross: voucher.sumGross ?? undefined,
        status: voucher.status != null ? String(voucher.status) : undefined
      },
      message: `Created voucher **${voucher.voucherNumber ?? voucher.id}**.`
    };
  })
  .build();
