import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let bookVoucher = SlateTool.create(spec, {
  name: 'Book Voucher Payment',
  key: 'book_voucher',
  description: `Record a payment on a voucher (incoming invoice/receipt). Books the payment against a check account (bank account).`,
  instructions: ['Use the List Check Accounts tool to find the correct checkAccountId.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      voucherId: z.string().describe('ID of the voucher to book payment on'),
      amount: z.number().describe('Payment amount'),
      date: z.string().describe('Payment date in YYYY-MM-DD format'),
      type: z
        .enum(['N', 'CB', 'CF', 'O', 'OF', 'C'])
        .describe(
          'Payment type: N=Normal, CB=Cash, CF=CashFlow, O=Other, OF=Offset, C=Credit'
        ),
      checkAccountId: z.string().describe('ID of the check account (bank account)')
    })
  )
  .output(
    z.object({
      voucherId: z.string(),
      amountBooked: z.number(),
      booked: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    await client.bookVoucher(ctx.input.voucherId, {
      amount: ctx.input.amount,
      date: ctx.input.date,
      type: ctx.input.type,
      checkAccount: { id: ctx.input.checkAccountId, objectName: 'CheckAccount' }
    });

    return {
      output: {
        voucherId: ctx.input.voucherId,
        amountBooked: ctx.input.amount,
        booked: true
      },
      message: `Booked payment of **${ctx.input.amount}** on voucher **${ctx.input.voucherId}**.`
    };
  })
  .build();
