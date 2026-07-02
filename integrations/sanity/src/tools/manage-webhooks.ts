import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, or delete GROQ-powered webhooks in a Sanity project. Webhooks fire HTTP requests when content in the Content Lake changes. Supports GROQ-based filtering and custom projections for webhook payloads.`,
  instructions: [
    'Use action "list" to see all webhooks configured in the project.',
    'Use action "create" to set up a new webhook. A name and target URL are required.',
    'Use action "delete" with a webhookId to remove a webhook.',
    'The GROQ filter in the rule determines which documents trigger the webhook. The projection controls the payload shape.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('The operation to perform.'),
      webhookId: z.string().optional().describe('Webhook ID. Required for "delete" action.'),
      webhookName: z
        .string()
        .optional()
        .describe('Name for the webhook. Required for "create" action.'),
      targetUrl: z
        .string()
        .optional()
        .describe('URL that the webhook will send requests to. Required for "create" action.'),
      targetDataset: z
        .string()
        .optional()
        .describe(
          'Dataset to scope the webhook to. Defaults to the configured dataset. Use "*" for all datasets.'
        ),
      rule: z
        .object({
          on: z
            .array(z.enum(['create', 'update', 'delete']))
            .optional()
            .describe('Which document events trigger the webhook.'),
          filter: z
            .string()
            .optional()
            .describe('GROQ filter to match which documents trigger the webhook.'),
          projection: z
            .string()
            .optional()
            .describe('GROQ projection defining the webhook payload shape.')
        })
        .optional()
        .describe('Webhook triggering rules.'),
      httpMethod: z
        .enum(['POST', 'PUT', 'PATCH', 'DELETE', 'GET'])
        .optional()
        .describe('HTTP method for the webhook request.'),
      secret: z.string().optional().describe('Secret for webhook signature verification.'),
      customHeaders: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom HTTP headers to include in webhook requests.'),
      includeDrafts: z
        .boolean()
        .optional()
        .describe('Whether to trigger on draft document changes.')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z
            .object({
              webhookId: z.string().describe('Webhook ID.'),
              name: z.string().optional().describe('Webhook name.'),
              url: z.string().optional().describe('Target URL.'),
              dataset: z.string().optional().describe('Scoped dataset.'),
              isDisabled: z.boolean().optional().describe('Whether the webhook is disabled.')
            })
            .passthrough()
        )
        .optional()
        .describe('List of webhooks (for "list" action).'),
      created: z.any().optional().describe('Created webhook details (for "create" action).'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the webhook was deleted (for "delete" action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    if (ctx.input.action === 'list') {
      let webhooks = await client.listWebhooks();
      let mapped = (webhooks as any[]).map((w: any) => ({
        webhookId: w.id,
        name: w.name,
        url: w.url,
        dataset: w.dataset,
        isDisabled: w.isDisabledByUser,
        ...w
      }));
      return {
        output: { webhooks: mapped },
        message: `Found ${mapped.length} webhook(s) in the project.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.webhookName || !ctx.input.targetUrl) {
        throw new Error('webhookName and targetUrl are required for "create" action.');
      }
      let result = await client.createWebhook({
        name: ctx.input.webhookName,
        url: ctx.input.targetUrl,
        dataset: ctx.input.targetDataset || ctx.config.dataset,
        apiVersion: ctx.config.apiVersion,
        rule: ctx.input.rule,
        httpMethod: ctx.input.httpMethod,
        secret: ctx.input.secret,
        headers: ctx.input.customHeaders,
        includeDrafts: ctx.input.includeDrafts
      });
      return {
        output: { created: result },
        message: `Created webhook **${ctx.input.webhookName}** targeting \`${ctx.input.targetUrl}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.webhookId) {
        throw new Error('webhookId is required for "delete" action.');
      }
      await client.deleteWebhook(ctx.input.webhookId);
      return {
        output: { deleted: true },
        message: `Deleted webhook \`${ctx.input.webhookId}\`.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
