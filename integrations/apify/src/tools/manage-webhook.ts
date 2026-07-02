import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, get, update, delete, or list webhooks. Webhooks fire HTTP POST requests to a URL when Actor run or build events occur. Supports payload templates with variable interpolation.`,
  instructions: [
    'Use action "list" to list all webhooks.',
    'Use action "get" with webhookId to retrieve webhook details.',
    'Use action "create" with eventTypes, requestUrl, and optionally a condition to scope it to an Actor or Task.',
    'Use action "update" with webhookId and fields to change.',
    'Use action "delete" with webhookId to remove a webhook.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for get/update/delete)'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe(
          'Event types to trigger on (e.g. ["ACTOR.RUN.SUCCEEDED", "ACTOR.RUN.FAILED"])'
        ),
      requestUrl: z.string().optional().describe('URL to send the webhook POST request to'),
      actorId: z.string().optional().describe('Scope webhook to this Actor ID'),
      actorTaskId: z.string().optional().describe('Scope webhook to this Actor Task ID'),
      payloadTemplate: z
        .string()
        .optional()
        .describe('JSON payload template with {{variable}} interpolation'),
      headersTemplate: z
        .string()
        .optional()
        .describe('JSON headers template with {{variable}} interpolation'),
      description: z.string().optional().describe('Webhook description'),
      ignoreSslErrors: z
        .boolean()
        .optional()
        .describe('Whether to ignore SSL certificate errors'),
      doNotRetry: z.boolean().optional().describe('Whether to skip retries on failure'),
      limit: z.number().optional().default(25).describe('Max items for list'),
      offset: z.number().optional().default(0).describe('Pagination offset for list')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional().describe('Webhook ID'),
      eventTypes: z.array(z.string()).optional().describe('Event types'),
      requestUrl: z.string().optional().describe('Target URL'),
      condition: z.record(z.string(), z.any()).optional().describe('Webhook condition'),
      description: z.string().optional().describe('Webhook description'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('Webhook ID'),
            eventTypes: z.array(z.string()).describe('Event types'),
            requestUrl: z.string().describe('Target URL'),
            description: z.string().optional().describe('Description')
          })
        )
        .optional()
        .describe('Webhook list (for list action)'),
      total: z.number().optional().describe('Total webhooks'),
      deleted: z.boolean().optional().describe('Whether deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let webhooks = result.items.map(item => ({
        webhookId: item.id,
        eventTypes: item.eventTypes || [],
        requestUrl: item.requestUrl,
        description: item.description
      }));

      return {
        output: { webhooks, total: result.total },
        message: `Found **${result.total}** webhook(s), showing **${webhooks.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let webhook = await client.getWebhook(ctx.input.webhookId!);
      return {
        output: {
          webhookId: webhook.id,
          eventTypes: webhook.eventTypes,
          requestUrl: webhook.requestUrl,
          condition: webhook.condition,
          description: webhook.description,
          createdAt: webhook.createdAt,
          modifiedAt: webhook.modifiedAt
        },
        message: `Retrieved webhook \`${webhook.id}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      let condition: Record<string, any> = {};
      if (ctx.input.actorId !== undefined) condition.actorId = ctx.input.actorId;
      if (ctx.input.actorTaskId !== undefined) condition.actorTaskId = ctx.input.actorTaskId;

      let webhook = await client.createWebhook({
        eventTypes: ctx.input.eventTypes!,
        requestUrl: ctx.input.requestUrl!,
        condition: Object.keys(condition).length > 0 ? condition : undefined,
        payloadTemplate: ctx.input.payloadTemplate,
        headersTemplate: ctx.input.headersTemplate,
        description: ctx.input.description,
        ignoreSslErrors: ctx.input.ignoreSslErrors,
        doNotRetry: ctx.input.doNotRetry
      });

      return {
        output: {
          webhookId: webhook.id,
          eventTypes: webhook.eventTypes,
          requestUrl: webhook.requestUrl,
          condition: webhook.condition,
          description: webhook.description,
          createdAt: webhook.createdAt
        },
        message: `Created webhook \`${webhook.id}\` for events: ${(webhook.eventTypes || []).join(', ')}.`
      };
    }

    if (ctx.input.action === 'update') {
      let body: Record<string, any> = {};
      if (ctx.input.eventTypes !== undefined) body.eventTypes = ctx.input.eventTypes;
      if (ctx.input.requestUrl !== undefined) body.requestUrl = ctx.input.requestUrl;
      if (ctx.input.payloadTemplate !== undefined)
        body.payloadTemplate = ctx.input.payloadTemplate;
      if (ctx.input.headersTemplate !== undefined)
        body.headersTemplate = ctx.input.headersTemplate;
      if (ctx.input.description !== undefined) body.description = ctx.input.description;
      if (ctx.input.ignoreSslErrors !== undefined)
        body.ignoreSslErrors = ctx.input.ignoreSslErrors;
      if (ctx.input.doNotRetry !== undefined) body.doNotRetry = ctx.input.doNotRetry;

      let condition: Record<string, any> = {};
      if (ctx.input.actorId !== undefined) condition.actorId = ctx.input.actorId;
      if (ctx.input.actorTaskId !== undefined) condition.actorTaskId = ctx.input.actorTaskId;
      if (Object.keys(condition).length > 0) body.condition = condition;

      let webhook = await client.updateWebhook(ctx.input.webhookId!, body);
      return {
        output: {
          webhookId: webhook.id,
          eventTypes: webhook.eventTypes,
          requestUrl: webhook.requestUrl,
          condition: webhook.condition,
          description: webhook.description,
          modifiedAt: webhook.modifiedAt
        },
        message: `Updated webhook \`${webhook.id}\`.`
      };
    }

    // delete
    await client.deleteWebhook(ctx.input.webhookId!);
    return {
      output: { webhookId: ctx.input.webhookId, deleted: true },
      message: `Deleted webhook \`${ctx.input.webhookId}\`.`
    };
  })
  .build();
