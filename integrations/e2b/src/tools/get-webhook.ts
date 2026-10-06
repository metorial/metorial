import { SlateTool } from 'slates';
import { z } from 'zod';
import { E2BClient } from '../lib/client';
import { spec } from '../spec';
import { webhookSchema } from './manage-webhooks';

export const getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Read the configuration of one sandbox lifecycle webhook. Use list_webhooks to discover webhook IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      webhookId: z.string().min(1).describe('Webhook ID from list_webhooks or create_webhook.')
    })
  )
  .output(webhookSchema)
  .handleInvocation(async ctx => {
    const output = await new E2BClient({ token: ctx.auth.token }).getWebhook(
      ctx.input.webhookId
    );
    return { output, message: `Retrieved webhook **${output.name}** (${output.webhookId}).` };
  })
  .build();
