import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requiredString } from '../lib/response';
import { spec } from '../spec';

export let reverseTransaction = SlateTool.create(spec, {
  name: 'Reverse Transaction',
  key: 'reverse_transaction',
  description:
    'Reverse a credit reception, prepaid transaction, or gift card transaction by its UUID. Creates a compensating transaction using the original values. Gift card reversal is limited to the latest transaction.'
})
  .input(
    z.object({
      type: z.enum(['credit', 'prepaid', 'giftcard']).describe('Type of original transaction'),
      transactionUuid: z.string().describe('UUID of the original transaction to reverse')
    })
  )
  .output(
    z.object({
      transactionUuid: z.string().describe('UUID of the compensating transaction'),
      credits: z.number().optional(),
      amountInCents: z.number().optional(),
      raw: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result =
      ctx.input.type === 'credit'
        ? await client.reverseCreditReception(ctx.input.transactionUuid)
        : ctx.input.type === 'prepaid'
          ? await client.reversePrepaidTransaction(ctx.input.transactionUuid)
          : await client.reverseGiftcardTransaction(ctx.input.transactionUuid);
    return {
      output: {
        transactionUuid: requiredString(result.data.uuid, 'reversal transaction UUID'),
        credits: result.data.credits ?? undefined,
        amountInCents: result.data.amount_in_cents ?? undefined,
        raw: result.data
      },
      message: `Reversed ${ctx.input.type} transaction ${ctx.input.transactionUuid}.`
    };
  })
  .build();
