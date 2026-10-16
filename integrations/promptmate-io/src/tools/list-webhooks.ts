import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, webhookSchema } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description:
    'List webhook subscriptions for the authenticated Promptmate.io user, including callback URLs, job or row event types, app restrictions, and deletion references when returned.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ webhooks: z.array(webhookSchema) }))
  .handleInvocation(async ctx => {
    let webhooks = await new Client({ token: ctx.auth.token }).listWebhooks();
    return { output: { webhooks }, message: `Found **${webhooks.length}** webhook(s).` };
  })
  .build();
