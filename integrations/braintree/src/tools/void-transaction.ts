import { SlateTool } from 'slates';
import { z } from 'zod';
import { BraintreeRestClient } from '../lib/client';
import { parseXml } from '../lib/xml';
import { spec } from '../spec';

export let voidTransaction = SlateTool.create(spec, {
  name: 'Void Transaction',
  key: 'void_transaction',
  description: `Voids a Braintree transaction that has not yet settled. Once a transaction is voided, the authorization hold on the customer's payment method is released.
Only transactions with status "authorized", "submitted_for_settlement", or "settlement_pending" can be voided.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactionId: z.string().describe('Legacy transaction ID to void')
    })
  )
  .output(
    z.object({
      transactionId: z.string().describe('Transaction ID'),
      status: z.string().describe('Transaction status after void')
    })
  )
  .handleInvocation(async ctx => {
    let rest = new BraintreeRestClient({
      token: ctx.auth.token,
      merchantId: ctx.auth.merchantId,
      environment: ctx.config.environment
    });

    let xml = await rest.put(`/transactions/${ctx.input.transactionId}/void`, '');
    let parsed = parseXml(xml);
    let txn = parsed.transaction || parsed;

    return {
      output: {
        transactionId: txn.id || ctx.input.transactionId,
        status: txn.status || 'voided'
      },
      message: `Transaction \`${ctx.input.transactionId}\` voided — status: **${txn.status || 'voided'}**`
    };
  })
  .build();
