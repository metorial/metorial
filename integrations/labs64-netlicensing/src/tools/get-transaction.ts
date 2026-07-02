import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransaction = SlateTool.create(spec, {
  name: 'Get Transaction',
  key: 'get_transaction',
  description: `Retrieve a single transaction by its number. Returns full transaction details including status, source, payment method, and dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transactionNumber: z.string().describe('Transaction number to retrieve')
    })
  )
  .output(
    z.object({
      transactionNumber: z.string().describe('Transaction identifier'),
      active: z.boolean().optional().describe('Whether active'),
      status: z.string().optional().describe('Status (PENDING, CLOSED, CANCELLED)'),
      source: z.string().optional().describe('Source (SHOP, AUTO)'),
      dateCreated: z.string().optional().describe('Creation date'),
      dateClosed: z.string().optional().describe('Closing date'),
      paymentMethod: z.string().optional().describe('Payment method used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.getTransaction(ctx.input.transactionNumber);
    if (!result) throw new Error(`Transaction ${ctx.input.transactionNumber} not found`);
    return {
      output: {
        transactionNumber: result.number,
        active: result.active,
        status: result.status,
        source: result.source,
        dateCreated: result.dateCreated,
        dateClosed: result.dateClosed,
        paymentMethod: result.paymentMethod
      },
      message: `Transaction **${result.number}** (${result.status}) retrieved.`
    };
  })
  .build();
