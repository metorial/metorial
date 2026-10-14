import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getObjectResult } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, or delete outbound webhooks for form and conversation events. Delivery is attempted once; the provider currently does not retry failures or send an HMAC signature.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Operation to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for update/delete)'),
      name: z.string().optional().describe('Webhook name (required for create)'),
      endpoint: z.string().optional().describe('Webhook endpoint URL (required for create)'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      name: z.string().optional(),
      endpoint: z.string().optional(),
      enabled: z.boolean().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name?.trim() || !ctx.input.endpoint?.trim()) {
        throw createApiServiceError('name and endpoint are required to create a webhook.');
      }
      let result = await client.createWebhook({
        name: ctx.input.name!,
        endpoint: ctx.input.endpoint!,
        enabled: ctx.input.enabled
      });
      let data = getObjectResult(result);
      return {
        output: {
          webhookId: data.id ?? ctx.input.webhookId,
          name: data.name ?? undefined,
          endpoint: data.endpoint ?? undefined,
          enabled: data.enabled ?? undefined
        },
        message: `Created webhook **${data.name}** → \`${data.endpoint}\`.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateWebhook(ctx.input.webhookId!, {
        name: ctx.input.name,
        endpoint: ctx.input.endpoint,
        enabled: ctx.input.enabled
      });
      let data = getObjectResult(result);
      return {
        output: {
          webhookId: data.id ?? ctx.input.webhookId,
          name: data.name ?? undefined,
          endpoint: data.endpoint ?? undefined,
          enabled: data.enabled ?? undefined
        },
        message: `Updated webhook **${data.name || ctx.input.webhookId}**.`
      };
    }

    // delete
    await client.deleteWebhook(ctx.input.webhookId!);
    return {
      output: {
        webhookId: ctx.input.webhookId,
        deleted: true
      },
      message: `Deleted webhook \`${ctx.input.webhookId}\`.`
    };
  })
  .build();
