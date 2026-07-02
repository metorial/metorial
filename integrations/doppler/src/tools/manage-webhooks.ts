import { SlateTool } from 'slates';
import { z } from 'zod';
import { DopplerClient } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookSlug: z.string().optional().describe('Webhook unique slug identifier'),
  url: z.string().optional().describe('Webhook target URL'),
  enabled: z.boolean().optional().describe('Whether the webhook is enabled'),
  enabledConfigs: z.array(z.string()).optional().describe('Configs that trigger this webhook'),
  hasSecret: z.boolean().optional().describe('Whether a signing secret is configured'),
  hasPayload: z.boolean().optional().describe('Whether a custom payload is configured')
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, update, enable, disable, or delete webhooks for a Doppler project. Webhooks send POST requests to a URL when secrets change in specified configs, enabling automated deployments and CI/CD triggers.`,
  instructions: [
    'Use action "list" to view all webhooks in a project.',
    'Use action "get" with webhookSlug to retrieve a specific webhook.',
    'Use action "create" with a project and URL to set up a new webhook.',
    'Use action "update" to modify a webhook\'s URL, configs, payload, or authentication.',
    'Use action "enable" or "disable" to toggle a webhook on or off.',
    'Use action "delete" to permanently remove a webhook.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      project: z.string().describe('Project slug'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'enable', 'disable', 'delete'])
        .describe('Action to perform'),
      webhookSlug: z
        .string()
        .optional()
        .describe('Webhook slug (required for get, update, enable, disable, delete)'),
      url: z.string().optional().describe('Webhook target URL (required for create)'),
      secret: z.string().optional().describe('Signing secret for webhook verification'),
      enabledConfigs: z
        .array(z.string())
        .optional()
        .describe('Config names that trigger this webhook'),
      customPayload: z
        .string()
        .optional()
        .describe('Custom JSON payload to send with webhook events'),
      authentication: z
        .object({
          type: z.string().optional().describe('Authentication type'),
          token: z.string().optional().describe('Bearer token'),
          username: z.string().optional().describe('Basic auth username'),
          password: z.string().optional().describe('Basic auth password')
        })
        .optional()
        .describe('Authentication for the target URL')
    })
  )
  .output(
    z.object({
      webhooks: z.array(webhookSchema).optional().describe('List of webhooks'),
      webhook: webhookSchema.optional().describe('Single webhook details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DopplerClient({ token: ctx.auth.token });

    let mapWebhook = (w: any) => ({
      webhookSlug: w.slug,
      url: w.url,
      enabled: w.enabled,
      enabledConfigs: w.enabledConfigs || w.enabled_configs,
      hasSecret: !!w.secret || w.hasSecret,
      hasPayload: !!w.payload || w.hasPayload
    });

    if (ctx.input.action === 'list') {
      let webhooks = await client.listWebhooks(ctx.input.project);

      return {
        output: { webhooks: webhooks.map(mapWebhook) },
        message: `Found **${webhooks.length}** webhooks in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.webhookSlug) throw new Error('webhookSlug is required for "get" action');

      let webhook = await client.getWebhook(ctx.input.project, ctx.input.webhookSlug);

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Retrieved webhook **${ctx.input.webhookSlug}** from project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.url) throw new Error('url is required for "create" action');

      let webhook = await client.createWebhook(ctx.input.project, {
        url: ctx.input.url,
        secret: ctx.input.secret,
        enabledConfigs: ctx.input.enabledConfigs,
        payload: ctx.input.customPayload,
        authentication: ctx.input.authentication
      });

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Created webhook for **${ctx.input.url}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.webhookSlug)
        throw new Error('webhookSlug is required for "update" action');

      let webhook = await client.updateWebhook(ctx.input.project, ctx.input.webhookSlug, {
        url: ctx.input.url,
        secret: ctx.input.secret,
        enabledConfigs: ctx.input.enabledConfigs,
        payload: ctx.input.customPayload,
        authentication: ctx.input.authentication
      });

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Updated webhook **${ctx.input.webhookSlug}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'enable') {
      if (!ctx.input.webhookSlug)
        throw new Error('webhookSlug is required for "enable" action');

      let webhook = await client.enableWebhook(ctx.input.project, ctx.input.webhookSlug);

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Enabled webhook **${ctx.input.webhookSlug}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'disable') {
      if (!ctx.input.webhookSlug)
        throw new Error('webhookSlug is required for "disable" action');

      let webhook = await client.disableWebhook(ctx.input.project, ctx.input.webhookSlug);

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Disabled webhook **${ctx.input.webhookSlug}** in project **${ctx.input.project}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.webhookSlug)
        throw new Error('webhookSlug is required for "delete" action');

      await client.deleteWebhook(ctx.input.project, ctx.input.webhookSlug);

      return {
        output: {},
        message: `Deleted webhook **${ctx.input.webhookSlug}** from project **${ctx.input.project}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
