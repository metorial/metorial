import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteWebhooks = SlateTool.create(spec, {
  name: 'Delete Webhooks',
  key: 'delete_webhooks',
  description: `Delete one or more webhooks by their IDs. This permanently removes the webhook configurations.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookIds: z.array(z.string()).min(1).describe('IDs of the webhooks to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteWebhooks(ctx.input.webhookIds);

    return {
      output: { success: true },
      message: `Deleted **${ctx.input.webhookIds.length}** webhook(s).`
    };
  })
  .build();
