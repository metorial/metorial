import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTransactions = SlateTool.create(spec, {
  name: 'List Transactions',
  key: 'list_transactions',
  description: `Retrieve all transactions for the current vendor. Transactions are created whenever licenses are obtained by a licensee through shop purchases, vendor assignments, or licensing model rules.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      transactions: z
        .array(
          z.object({
            transactionNumber: z.string().describe('Transaction identifier'),
            active: z.boolean().optional().describe('Whether active'),
            status: z
              .string()
              .optional()
              .describe('Transaction status (PENDING, CLOSED, CANCELLED)'),
            source: z.string().optional().describe('Transaction source (SHOP, AUTO)'),
            dateCreated: z.string().optional().describe('Creation date'),
            dateClosed: z.string().optional().describe('Closing date'),
            paymentMethod: z.string().optional().describe('Payment method used')
          })
        )
        .describe('List of transactions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let items = await client.listTransactions();
    let transactions = items.map(item => ({
      transactionNumber: item.number,
      active: item.active,
      status: item.status,
      source: item.source,
      dateCreated: item.dateCreated,
      dateClosed: item.dateClosed,
      paymentMethod: item.paymentMethod
    }));
    return {
      output: { transactions },
      message: `Found **${transactions.length}** transaction(s).`
    };
  })
  .build();
