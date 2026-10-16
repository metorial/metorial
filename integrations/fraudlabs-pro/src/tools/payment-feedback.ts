import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let paymentFeedback = SlateTool.create(spec, {
  name: 'Submit Payment Feedback',
  key: 'payment_feedback',
  description:
    'Reports a payment gateway outcome to improve fraud detection and risk assessment. Optionally associate the payment with an existing screened transaction.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      email: z.string().describe('Email address associated with the payment order'),
      status: z.string().describe('Final payment gateway status, such as declined'),
      message: z.string().describe('Message returned by the payment gateway'),
      fraudlabsproId: z
        .string()
        .optional()
        .describe('Existing FraudLabs Pro transaction ID to associate with the payment')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('Provider result for the reported payment outcome'),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Complete provider response, excluding credentials')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).feedbackPayment(ctx.input);
    if (!Object.hasOwn(result, 'result')) {
      throw createApiServiceError(
        'FraudLabs Pro returned an invalid payment feedback response.'
      );
    }
    return {
      output: { result: result.result, raw: result },
      message: 'Payment feedback submitted.'
    };
  })
  .build();
