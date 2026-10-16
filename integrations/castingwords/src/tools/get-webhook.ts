import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Read the account notification URL used for transcript completion, refunds, duplicate files, and billing holds.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      webhookUrl: z
        .string()
        .nullable()
        .describe('Registered notification URL, or null when none is returned'),
      raw: z.unknown().describe('Provider response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client(ctx.auth.token).getWebhook();
    return {
      output: result,
      message: result.webhookUrl
        ? 'Retrieved the account notification URL.'
        : 'The account has no notification URL.'
    };
  })
  .build();
