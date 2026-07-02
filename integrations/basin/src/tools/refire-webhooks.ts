import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let refireWebhooks = SlateTool.create(spec, {
  name: 'Refire Webhooks',
  key: 'refire_webhooks',
  description: `Re-trigger webhook delivery for one or more submissions. Useful when a webhook previously failed or when you need to resend submission data to connected services.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      submissionIds: z
        .array(z.number())
        .min(1)
        .describe('One or more submission IDs to refire webhooks for.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the refire was successful.'),
      message: z.string().describe('Response message from Basin.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: { success: boolean; message: string };

    if (ctx.input.submissionIds.length === 1) {
      result = await client.refireWebhooksForSubmission(ctx.input.submissionIds[0]!);
    } else {
      result = await client.refireWebhooksForSubmissions(ctx.input.submissionIds);
    }

    return {
      output: {
        success: result.success,
        message: result.message
      },
      message: `Refired webhooks for **${ctx.input.submissionIds.length}** submission(s): ${result.message}`
    };
  })
  .build();
