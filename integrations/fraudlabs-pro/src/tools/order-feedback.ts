import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseProviderOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  fraudlabsproId: z.string().describe('The transaction ID that was updated')
});

export let orderFeedback = SlateTool.create(spec, {
  name: 'Submit Order Feedback',
  key: 'order_feedback',
  description: `Updates the status of a previously screened transaction. Use this to approve, reject, or reject-and-blacklist an order that was flagged for manual review. Feedback improves the FraudLabs Pro fraud detection algorithm over time.`,
  instructions: [
    'Use the fraudlabsproId returned from the Screen Order tool.',
    'REJECT_BLACKLIST adds transaction data to the blacklist used for future screenings.'
  ],
  tags: {
    readOnly: false,
    destructive: true
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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info('Submitting order feedback...');

    let result = await client.feedbackOrder({
      fraudlabsproId: ctx.input.fraudlabsproId,
      action: ctx.input.action,
      note: ctx.input.note
    });

    let output = parseProviderOutput(
      outputSchema,
      {
        fraudlabsproId: result.fraudlabspro_id
      },
      'order feedback'
    );

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
