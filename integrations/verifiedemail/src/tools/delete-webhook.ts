import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently delete a webhook from your VerifiedEmail account. The webhook will stop receiving event notifications immediately.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: { deleted: true },
      message: `Webhook \`${ctx.input.webhookId}\` has been permanently deleted.`
    };
  })
  .build();
