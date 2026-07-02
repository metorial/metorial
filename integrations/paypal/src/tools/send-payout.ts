import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { PayPalClient } from '../lib/client';
import { spec } from '../spec';

export let sendPayout = SlateTool.create(spec, {
  name: 'Send Payout',
  key: 'send_payout',
  description: `Send batch payouts to one or more recipients via PayPal email, phone, or PayPal ID. Supports multiple currencies and per-item notes. Returns a batch ID to track the payout status.`,
  instructions: [
    'Each recipient needs a **receiver** (email, phone, or PayPal ID) and an **amount**.',
    'The **senderBatchId** should be unique for each payout batch to prevent duplicates.'
  ],
  constraints: ['Maximum 15,000 items per batch in production.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      senderBatchId: z.string().describe('Unique batch ID to prevent duplicate payouts'),
      emailSubject: z.string().optional().describe('Email subject for payout notifications'),
      emailMessage: z.string().optional().describe('Email message body'),
      recipients: z
        .array(
          z.object({
            receiver: z.string().describe('Recipient email, phone, or PayPal ID'),
            recipientType: z
              .enum(['EMAIL', 'PHONE', 'PAYPAL_ID'])
              .optional()
              .describe('Type of receiver identifier. Defaults to EMAIL.'),
            amount: z.string().describe('Amount as a string (e.g. "100.00")'),
            currencyCode: z.string().describe('Three-character ISO-4217 currency code'),
            note: z.string().optional().describe('Note to the recipient'),
            senderItemId: z.string().optional().describe('Unique item ID for tracking')
          })
        )
        .min(1)
        .describe('List of payout recipients')
    })
  )
  .output(
    z.object({
      payoutBatchId: z.string().describe('PayPal payout batch ID'),
      batchStatus: z.string().describe('Batch status'),
      senderBatchId: z.string().optional().describe('Your sender batch ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PayPalClient({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      clientSecret: ctx.auth.clientSecret,
      environment: ctx.auth.environment
    });

    let items = ctx.input.recipients.map(r => ({
      recipient_type: r.recipientType || ('EMAIL' as const),
      amount: { currency: r.currencyCode, value: r.amount },
      receiver: r.receiver,
      note: r.note,
      sender_item_id: r.senderItemId
    }));

    let result = await client.createBatchPayout({
      senderBatchHeader: {
        sender_batch_id: ctx.input.senderBatchId,
        email_subject: ctx.input.emailSubject,
        email_message: ctx.input.emailMessage
      },
      items
    });

    let header = result.batch_header || {};

    return {
      output: {
        payoutBatchId: header.payout_batch_id,
        batchStatus: header.batch_status,
        senderBatchId: header.sender_batch_header?.sender_batch_id || ctx.input.senderBatchId
      },
      message: `Payout batch \`${header.payout_batch_id}\` created with ${ctx.input.recipients.length} recipient(s). Status: **${header.batch_status}**.`
    };
  })
  .build();
