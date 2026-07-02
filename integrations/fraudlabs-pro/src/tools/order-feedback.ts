import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let orderFeedback = SlateTool.create(spec, {
  name: 'Submit Order Feedback',
  key: 'order_feedback',
  description: `Updates the status of a previously screened transaction. Use this to approve, reject, or reject-and-blacklist an order that was flagged for manual review. Feedback improves the FraudLabs Pro fraud detection algorithm over time.`,
  instructions: [
    'Use the fraudlabsproId returned from the Screen Order tool.',
    'REJECT_BLACKLIST will permanently blacklist the transaction data for future screenings.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      fraudlabsproId: z
        .string()
        .describe('FraudLabs Pro transaction ID from the original screening'),
      action: z
        .enum(['APPROVE', 'REJECT', 'REJECT_BLACKLIST'])
        .describe(
          'Action to take: APPROVE, REJECT, or REJECT_BLACKLIST (reject and add to blacklist)'
        ),
      note: z
        .string()
        .optional()
        .describe('Optional note to attach to this feedback for reference')
    })
  )
  .output(
    z.object({
      fraudlabsproId: z.string().describe('The transaction ID that was updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info(`Submitting feedback for transaction ${ctx.input.fraudlabsproId}...`);

    let result = await client.feedbackOrder({
      fraudlabsproId: ctx.input.fraudlabsproId,
      action: ctx.input.action,
      note: ctx.input.note
    });

    let output = {
      fraudlabsproId: result.fraudlabspro_id
    };

    let actionLabel =
      ctx.input.action === 'APPROVE'
        ? 'approved'
        : ctx.input.action === 'REJECT'
          ? 'rejected'
          : 'rejected and blacklisted';

    return {
      output,
      message: `Transaction \`${output.fraudlabsproId}\` has been **${actionLabel}**.`
    };
  })
  .build();
