import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Permanently delete a webhook from a form. The webhook will stop receiving submission data.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to delete.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().describe('ID of the deleted webhook.'),
      deleted: z.boolean().describe('Whether the deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteFormWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        deleted: true
      },
      message: `Deleted webhook **#${ctx.input.webhookId}**.`
    };
  })
  .build();
