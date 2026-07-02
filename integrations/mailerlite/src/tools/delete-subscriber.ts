import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteSubscriber = SlateTool.create(spec, {
  name: 'Delete Subscriber',
  key: 'delete_subscriber',
  description: `Deletes a subscriber from the account, or performs a GDPR-compliant "forget" operation that permanently removes all subscriber data within 30 days. Use **forget** mode for full GDPR compliance.`,
  instructions: [
    'Use "delete" mode to remove a subscriber while preserving historical data.',
    'Use "forget" mode for GDPR-compliant permanent data removal.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subscriberId: z.string().describe('ID of the subscriber to delete or forget'),
      mode: z
        .enum(['delete', 'forget'])
        .default('delete')
        .describe(
          'Delete mode: "delete" removes the subscriber, "forget" performs GDPR-compliant permanent removal'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.mode === 'forget') {
      await client.forgetSubscriber(ctx.input.subscriberId);
    } else {
      await client.deleteSubscriber(ctx.input.subscriberId);
    }

    return {
      output: {
        success: true
      },
      message:
        ctx.input.mode === 'forget'
          ? `Subscriber **${ctx.input.subscriberId}** has been forgotten (GDPR-compliant removal).`
          : `Subscriber **${ctx.input.subscriberId}** has been deleted.`
    };
  })
  .build();
