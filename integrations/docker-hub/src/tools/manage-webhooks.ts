import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List webhooks configured for a Docker Hub repository. Webhooks fire on image push events and can trigger actions in external services.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe('Docker Hub namespace. Falls back to configured default namespace.'),
      repositoryName: z.string().describe('Name of the repository.')
    })
  )
  .output(
    z.object({
      webhooks: z.array(
        z.object({
          webhookId: z.number().describe('Unique webhook ID.'),
          webhookName: z.string().describe('Name of the webhook.'),
          isActive: z.boolean().describe('Whether the webhook is active.'),
          hookUrls: z.array(z.string()).describe('URLs that receive webhook POST requests.'),
          creator: z.string().describe('Username of the webhook creator.'),
          createdAt: z.string().describe('ISO timestamp when the webhook was created.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    let result = await client.listWebhooks(ns, ctx.input.repositoryName);

    return {
      output: {
        webhooks: result.results.map(w => ({
          webhookId: w.id,
          webhookName: w.name,
          isActive: w.active,
          hookUrls: (w.webhooks || []).map(h => h.hook_url),
          creator: w.creator || '',
          createdAt: w.created || ''
        }))
      },
      message: `Found **${result.results.length}** webhooks for **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a webhook for a Docker Hub repository. The webhook will send a POST request to the specified URL whenever an image is pushed to the repository.`,
  instructions: [
    'The webhook URL must be a publicly accessible HTTPS endpoint.',
    'Webhooks fire on every image push event including tag additions.'
  ]
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe('Docker Hub namespace. Falls back to configured default namespace.'),
      repositoryName: z.string().describe('Name of the repository.'),
      webhookName: z.string().describe('Descriptive name for the webhook.'),
      webhookUrl: z.string().describe('URL to receive webhook POST requests.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().describe('Unique webhook ID.'),
      webhookName: z.string().describe('Name of the created webhook.'),
      hookUrls: z.array(z.string()).describe('URLs that receive webhook POST requests.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    let webhook = await client.createWebhook(ns, ctx.input.repositoryName, {
      name: ctx.input.webhookName,
      webhookUrl: ctx.input.webhookUrl
    });

    return {
      output: {
        webhookId: webhook.id,
        webhookName: webhook.name,
        hookUrls: (webhook.webhooks || []).map(h => h.hook_url)
      },
      message: `Created webhook **${webhook.name}** for **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description: `Delete a webhook from a Docker Hub repository. The webhook will stop sending push event notifications.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe('Docker Hub namespace. Falls back to configured default namespace.'),
      repositoryName: z.string().describe('Name of the repository.'),
      webhookId: z.number().describe('ID of the webhook to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the webhook was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    await client.deleteWebhook(ns, ctx.input.repositoryName, ctx.input.webhookId);

    return {
      output: { deleted: true },
      message: `Deleted webhook **${ctx.input.webhookId}** from **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
