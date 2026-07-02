import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve details of a specific Ramp card transaction by its ID. Returns full transaction data including amount, currency, merchant, card holder, category, memo, receipts, and policy violations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Unique identifier of the transaction')
    })
  )
  .output(
    z.object({
      transaction: z.any().describe('Full transaction object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let transaction = await client.getTransaction(ctx.input.transactionId);

    return {
      output: { transaction },
      message: `Retrieved transaction **${ctx.input.transactionId}** — ${transaction.merchant_name || 'unknown merchant'}, amount: ${transaction.amount}`
    };
  })
  .build();
