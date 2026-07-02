import { SlateTool } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List all webhook endpoints configured in your Fluxguard account. Each webhook receives change notifications when monitored pages are updated.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('ID of the webhook'),
            url: z.string().optional().describe('URL of the webhook endpoint'),
            secret: z
              .string()
              .optional()
              .describe('Secret key for verifying webhook signatures')
          })
        )
        .describe('All webhooks in the account')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.listWebhooks();

    let webhooks: Array<{ webhookId: string; url?: string; secret?: string }> = [];
    if (Array.isArray(result)) {
      webhooks = result.map((w: any) => ({
        webhookId: w.id ?? w.webhookId ?? '',
        url: w.url ?? undefined,
        secret: w.secret ?? undefined
      }));
    }

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhooks.`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook endpoint in Fluxguard. The webhook will receive change notifications when monitored pages are updated. Each webhook includes a secret key for HMAC SHA-256 signature verification.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('The URL of the webhook endpoint to receive change notifications')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the newly created webhook')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.createWebhook(ctx.input.url);

    return {
      output: {
        webhookId: result.id ?? result.webhookId ?? ''
      },
      message: `Created webhook for **${ctx.input.url}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook endpoint from your Fluxguard account. The webhook will no longer receive change notifications.`,
  tags: {
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
      webhookId: z.string().describe('ID of the deleted webhook'),
      deleted: z.boolean().describe('Whether the webhook was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    await client.deleteWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: ctx.input.webhookId,
        deleted: true
      },
      message: `Deleted webhook \`${ctx.input.webhookId}\`.`
    };
  })
  .build();

export let getWebhookSample = SlateTool.create(spec, {
  name: 'Get Webhook Sample',
  key: 'get_webhook_sample',
  description: `Fetch a sample webhook payload to preview the data format Fluxguard sends when changes are detected. Useful for testing and setting up integrations before going live.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      samplePayload: z.any().describe('Sample webhook payload showing the data format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FluxguardClient(ctx.auth.token);

    let result = await client.getWebhookSample();

    return {
      output: {
        samplePayload: result
      },
      message: `Retrieved sample webhook payload.`
    };
  })
  .build();
