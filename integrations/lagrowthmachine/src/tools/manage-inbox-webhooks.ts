import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createInboxWebhook = SlateTool.create(spec, {
  name: 'Create Inbox Webhook',
  key: 'create_inbox_webhook',
  description: `Create an inbox webhook in La Growth Machine for real-time notifications about LinkedIn and email messages. You can optionally scope the webhook to specific campaigns.`
})
  .input(
    z.object({
      name: z.string().describe('Unique name for the webhook'),
      url: z.string().describe('Publicly accessible URL to receive webhook notifications'),
      description: z.string().optional().describe('Internal description for the webhook'),
      campaignIds: z
        .array(z.string())
        .optional()
        .describe(
          'Campaign IDs to scope the webhook to. If omitted, receives all inbox events.'
        )
    })
  )
  .output(
    z.object({
      webhook: z.any().describe('The created webhook record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createInboxWebhook({
      name: ctx.input.name,
      url: ctx.input.url,
      description: ctx.input.description,
      campaigns: ctx.input.campaignIds
    });

    return {
      output: { webhook: result },
      message: `Inbox webhook **${ctx.input.name}** created successfully.`
    };
  })
  .build();

export let listInboxWebhooks = SlateTool.create(spec, {
  name: 'List Inbox Webhooks',
  key: 'list_inbox_webhooks',
  description: `List all inbox webhooks currently configured in your La Growth Machine workspace. Returns webhook details including IDs, names, and target URLs.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z.array(z.any()).describe('List of inbox webhook records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listInboxWebhooks();

    let webhooks = Array.isArray(result) ? result : (result?.webhooks ?? [result]);

    return {
      output: { webhooks },
      message: `Retrieved **${webhooks.length}** inbox webhook(s).`
    };
  })
  .build();

export let deleteInboxWebhook = SlateTool.create(spec, {
  name: 'Delete Inbox Webhook',
  key: 'delete_inbox_webhook',
  description: `Delete an inbox webhook from your La Growth Machine workspace by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the inbox webhook to delete')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Confirmation of the deletion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteInboxWebhook(ctx.input.webhookId);

    return {
      output: { result },
      message: `Inbox webhook **${ctx.input.webhookId}** deleted successfully.`
    };
  })
  .build();
