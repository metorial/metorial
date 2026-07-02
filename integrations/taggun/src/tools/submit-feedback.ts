import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let submitFeedback = SlateTool.create(spec, {
  name: 'Submit Feedback',
  key: 'submit_feedback',
  description: `Submit manually verified receipt data for a previously scanned receipt, improving Taggun's AI model accuracy over time.

Provide the reference ID of the original scan along with corrected field values. This trains the model to deliver better extraction results for similar receipts in the future.`,
  instructions: [
    'The `referenceId` must match a receipt that was previously scanned with a referenceId tag.',
    'Only include fields that you want to correct — omit fields that were already correct.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      referenceId: z.string().describe('Reference ID of the previously scanned receipt'),
      totalAmount: z.number().optional().describe('Corrected total amount'),
      taxAmount: z.number().optional().describe('Corrected tax amount'),
      merchantName: z.string().optional().describe('Corrected merchant name'),
      currencyCode: z
        .string()
        .optional()
        .describe('Corrected currency code (e.g. "USD", "EUR")'),
      date: z.string().optional().describe('Corrected date in ISO 8601 format'),
      masterCategory: z.string().optional().describe('Corrected spending category')
    })
  )
  .output(
    z.object({
      result: z.string().nullable().optional().describe('Feedback submission result')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.submitFeedback({
      referenceId: ctx.input.referenceId,
      totalAmount: ctx.input.totalAmount,
      taxAmount: ctx.input.taxAmount,
      merchantName: ctx.input.merchantName,
      currencyCode: ctx.input.currencyCode,
      date: ctx.input.date,
      masterCategory: ctx.input.masterCategory
    });

    return {
      output: {
        result: result?.result ?? 'Feedback submitted successfully.'
      },
      message: `Feedback submitted for receipt **${ctx.input.referenceId}**.`
    };
  })
  .build();
