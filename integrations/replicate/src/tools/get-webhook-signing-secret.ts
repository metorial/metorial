import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWebhookSigningSecret = SlateTool.create(spec, {
  name: 'Get Webhook Signing Secret',
  key: 'get_webhook_signing_secret',
  description: `Get the signing secret for Replicate's default webhook so incoming webhook payloads can be verified.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      secret: z.string().describe('Default webhook signing secret')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getWebhookSigningSecret();

    return {
      output: {
        secret: result.key
      },
      message: 'Retrieved the Replicate default webhook signing secret.'
    };
  })
  .build();
