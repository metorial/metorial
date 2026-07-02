import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `Create, list, update, or delete outbound webhooks for a CircleCI project. Webhooks push event notifications (workflow-completed, job-completed) to external HTTP endpoints.`,
  constraints: ['Maximum of 5 webhooks per project.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z.string().optional().describe('Project UUID (required for list and create)'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook UUID (required for get, update, and delete)'),
      name: z.string().optional().describe('Webhook name (required for create)'),
      url: z
        .string()
        .optional()
        .describe('Receiver URL for the webhook (required for create)'),
      events: z
        .array(z.enum(['workflow-completed', 'job-completed']))
        .optional()
        .describe('Events to subscribe to (required for create)'),
      signingSecret: z
        .string()
        .optional()
        .describe('Secret for HMAC-SHA256 signature verification'),
      verifyTls: z
        .boolean()
        .optional()
        .describe('Whether to verify TLS certificates (defaults to true)')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string(),
            name: z.string(),
            url: z.string(),
            events: z.array(z.string()),
            verifyTls: z.boolean().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional(),
      webhook: z
        .object({
          webhookId: z.string(),
          name: z.string(),
          url: z.string(),
          events: z.array(z.string()),
          verifyTls: z.boolean().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapWebhook = (w: any) => ({
      webhookId: w.id,
      name: w.name,
      url: w.url,
      events: w.events,
      verifyTls: w['verify-tls'],
      createdAt: w['created-at'],
      updatedAt: w['updated-at']
    });

    if (ctx.input.action === 'list') {
      if (!ctx.input.projectId) throw new Error('projectId is required for listing webhooks.');
      let result = await client.listWebhooks(ctx.input.projectId);
      let webhooks = (result.items || []).map(mapWebhook);
      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s) for project.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required to get a webhook.');
      let w = await client.getWebhook(ctx.input.webhookId);
      return {
        output: { webhook: mapWebhook(w) },
        message: `Webhook **${w.name}** → \`${w.url}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.projectId) throw new Error('projectId is required to create a webhook.');
      if (!ctx.input.name) throw new Error('name is required to create a webhook.');
      if (!ctx.input.url) throw new Error('url is required to create a webhook.');
      if (!ctx.input.events || ctx.input.events.length === 0)
        throw new Error('At least one event is required to create a webhook.');

      let w = await client.createWebhook({
        name: ctx.input.name,
        url: ctx.input.url,
        events: ctx.input.events,
        signingSecret: ctx.input.signingSecret,
        verifyTls: ctx.input.verifyTls,
        scope: { id: ctx.input.projectId, type: 'project' }
      });
      return {
        output: { webhook: mapWebhook(w) },
        message: `Webhook **${w.name}** created for events [${ctx.input.events.join(', ')}].`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required to update a webhook.');
      let w = await client.updateWebhook(ctx.input.webhookId, {
        name: ctx.input.name,
        url: ctx.input.url,
        events: ctx.input.events,
        signingSecret: ctx.input.signingSecret,
        verifyTls: ctx.input.verifyTls
      });
      return {
        output: { webhook: mapWebhook(w) },
        message: `Webhook **${w.name}** updated.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.webhookId) throw new Error('webhookId is required to delete a webhook.');
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: { deleted: true },
        message: `Webhook \`${ctx.input.webhookId}\` deleted.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
