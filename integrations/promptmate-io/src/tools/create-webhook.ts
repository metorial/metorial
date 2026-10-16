import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, createdWebhookSchema } from '../lib/client';
import { spec } from '../spec';

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description:
    'Register a callback for completed Promptmate.io jobs or rows. Subscriptions belong to the authenticated user and can be restricted to selected apps.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      webhookType: z
        .enum(['job', 'row'])
        .describe('Notify after an entire job or each individual row finishes'),
      endpointUrl: z.string().describe('Callback URL to receive result arrays'),
      webhookName: z.string().optional().describe('Name for the subscription'),
      restrictedAppIds: z
        .array(z.string())
        .optional()
        .describe('App IDs from list_apps. Omit to receive events for all apps.'),
      webhookReference: z
        .string()
        .optional()
        .describe('Your reference for identifying and deleting the subscription')
    })
  )
  .output(z.object({ webhooks: z.array(createdWebhookSchema) }))
  .handleInvocation(async ctx => {
    let webhooks = await new Client({ token: ctx.auth.token }).createWebhook(ctx.input);
    return {
      output: { webhooks },
      message: 'Promptmate.io created the webhook subscription.'
    };
  })
  .build();
