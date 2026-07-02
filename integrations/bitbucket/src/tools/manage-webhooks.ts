import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

let formatWebhook = (hook: any) => ({
  webhookUuid: hook.uuid,
  url: hook.url,
  description: hook.description || undefined,
  active: hook.active,
  events: hook.events || [],
  subjectType: hook.subject_type || undefined,
  createdAt: hook.created_at || undefined,
  secretSet: hook.secret_set
});

export let manageWebhooksTool = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, get, update, or delete repository webhooks. Webhooks subscribe an external URL to Bitbucket repository events such as pushes, pull request updates, issue changes, and build status changes.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      webhookUuid: z
        .string()
        .optional()
        .describe('Webhook UUID (required for get/update/delete)'),
      url: z.string().optional().describe('Webhook target URL (required for create)'),
      description: z.string().optional().describe('Webhook description'),
      events: z
        .array(z.string())
        .optional()
        .describe('Webhook event keys. Defaults to ["repo:push"] when creating.'),
      active: z.boolean().optional().describe('Whether the webhook is active'),
      secret: z
        .string()
        .nullable()
        .optional()
        .describe('Webhook secret. Pass null on update to remove the secret.'),
      page: z.number().optional().describe('Page number for listing'),
      pageLen: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookUuid: z.string(),
            url: z.string(),
            description: z.string().optional(),
            active: z.boolean().optional(),
            events: z.array(z.string()),
            subjectType: z.string().optional(),
            createdAt: z.string().optional(),
            secretSet: z.boolean().optional()
          })
        )
        .optional(),
      webhook: z
        .object({
          webhookUuid: z.string(),
          url: z.string(),
          description: z.string().optional(),
          active: z.boolean().optional(),
          events: z.array(z.string()),
          subjectType: z.string().optional(),
          createdAt: z.string().optional(),
          secretSet: z.boolean().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks(ctx.input.repoSlug, {
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });
      let webhooks = (result.values || []).map(formatWebhook);

      return {
        output: { webhooks, hasNextPage: !!result.next },
        message: `Found **${webhooks.length}** repository webhooks.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.webhookUuid) {
        throw bitbucketServiceError('webhookUuid is required for get action');
      }

      let hook = await client.getWebhook(ctx.input.repoSlug, ctx.input.webhookUuid);

      return {
        output: { webhook: formatWebhook(hook) },
        message: `Retrieved webhook **${hook.uuid}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.url) {
        throw bitbucketServiceError('url is required for create action');
      }

      let body: Record<string, any> = {
        url: ctx.input.url,
        active: ctx.input.active ?? true,
        events: ctx.input.events?.length ? ctx.input.events : ['repo:push']
      };
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.secret !== undefined) body.secret = ctx.input.secret;

      let hook = await client.createWebhook(ctx.input.repoSlug, body);

      return {
        output: { webhook: formatWebhook(hook) },
        message: `Created webhook **${hook.uuid}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.webhookUuid) {
        throw bitbucketServiceError('webhookUuid is required for update action');
      }

      let body: Record<string, any> = {};
      if (ctx.input.url !== undefined) body.url = ctx.input.url;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.events !== undefined) body.events = ctx.input.events;
      if (ctx.input.active !== undefined) body.active = ctx.input.active;
      if (ctx.input.secret !== undefined) body.secret = ctx.input.secret;

      if (Object.keys(body).length === 0) {
        throw bitbucketServiceError(
          'At least one webhook field is required for update action'
        );
      }

      let hook = await client.updateWebhook(ctx.input.repoSlug, ctx.input.webhookUuid, body);

      return {
        output: { webhook: formatWebhook(hook) },
        message: `Updated webhook **${hook.uuid}**.`
      };
    }

    if (!ctx.input.webhookUuid) {
      throw bitbucketServiceError('webhookUuid is required for delete action');
    }

    await client.deleteWebhook(ctx.input.repoSlug, ctx.input.webhookUuid);

    return {
      output: { deleted: true },
      message: `Deleted webhook **${ctx.input.webhookUuid}**.`
    };
  })
  .build();
