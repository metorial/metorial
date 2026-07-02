import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWebhookTool = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a Postman webhook that triggers a collection run when its URL is called. The webhook URL can receive a JSON payload that is accessible inside the collection. Useful for integrating Postman collection runs with external systems.`,
  constraints: [
    'Webhooks are create-only via the API — they cannot be updated or deleted programmatically.',
    'The returned webhook URL should be treated as a secret.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the webhook'),
      collectionUid: z
        .string()
        .describe('Collection UID to run when the webhook is triggered'),
      workspaceId: z.string().optional().describe('Workspace ID')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      name: z.string().optional(),
      webhookUrl: z.string().optional(),
      collectionUid: z.string().optional(),
      uid: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.createWebhook(
      { name: ctx.input.name, collection: ctx.input.collectionUid },
      ctx.input.workspaceId
    );

    return {
      output: {
        webhookId: webhook.id,
        name: webhook.name,
        webhookUrl: webhook.webhookUrl,
        collectionUid: webhook.collection,
        uid: webhook.uid
      },
      message: `Created webhook **"${webhook.name}"**. The webhook URL has been generated.`
    };
  })
  .build();
