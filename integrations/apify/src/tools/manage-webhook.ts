import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApifyClient } from '../lib/client';
import { spec } from '../spec';
import {
  ensureAtLeastOne,
  paginationInput,
  pickDefined,
  requireArray,
  requireString
} from './shared';

let mapWebhook = (webhook: Record<string, any>) => ({
  webhookId: webhook.id,
  eventTypes: webhook.eventTypes,
  requestUrl: webhook.requestUrl,
  condition: webhook.condition,
  description: webhook.description,
  isAdHoc: webhook.isAdHoc,
  createdAt: webhook.createdAt,
  modifiedAt: webhook.modifiedAt
});

let conditionFromInput = (input: {
  actorId?: string;
  actorTaskId?: string;
  actorRunId?: string;
}) => {
  let condition = pickDefined({
    actorId: input.actorId,
    actorTaskId: input.actorTaskId,
    actorRunId: input.actorRunId
  });
  return Object.keys(condition).length > 0 ? condition : undefined;
};

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, get, update, test, delete, or list Apify webhooks for Actor run and build events.`,
  instructions: [
    'Use create with eventTypes and requestUrl.',
    'Use actorId, actorTaskId, or actorRunId to scope the webhook condition.',
    'Use test to ask Apify to send a test webhook delivery.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'test', 'delete'])
        .describe('Action to perform'),
      webhookId: z.string().optional().describe('Webhook ID for get/update/test/delete'),
      eventTypes: z
        .array(z.string())
        .optional()
        .describe('Event types, such as ACTOR.RUN.SUCCEEDED'),
      requestUrl: z.string().optional().describe('Target URL for webhook POST requests'),
      actorId: z.string().optional().describe('Scope condition Actor ID'),
      actorTaskId: z.string().optional().describe('Scope condition Actor Task ID'),
      actorRunId: z.string().optional().describe('Scope condition Actor Run ID'),
      payloadTemplate: z.string().optional().describe('Webhook payload template'),
      headersTemplate: z.string().optional().describe('Webhook headers template'),
      description: z.string().optional().describe('Webhook description'),
      ignoreSslErrors: z.boolean().optional().describe('Whether to ignore SSL errors'),
      doNotRetry: z.boolean().optional().describe('Whether Apify should skip retries'),
      isAdHoc: z.boolean().optional().describe('Whether this is an ad-hoc webhook'),
      idempotencyKey: z.string().optional().describe('Idempotency key for create'),
      shouldInterpolateStrings: z
        .boolean()
        .optional()
        .describe('Whether Apify should interpolate string values in templates'),
      ...paginationInput
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional(),
      eventTypes: z.array(z.string()).optional(),
      requestUrl: z.string().optional(),
      condition: z.record(z.string(), z.any()).optional(),
      description: z.string().optional(),
      isAdHoc: z.boolean().optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional(),
      webhooks: z.array(z.record(z.string(), z.any())).optional(),
      total: z.number().optional(),
      testResult: z.record(z.string(), z.any()).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApifyClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listWebhooks({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        desc: ctx.input.descending
      });
      let webhooks = result.items.map(mapWebhook);
      return {
        output: { webhooks, total: result.total },
        message: `Found **${result.total}** webhook(s), showing **${webhooks.length}**.`
      };
    }

    if (ctx.input.action === 'get') {
      let webhookId = requireString(ctx.input.webhookId, 'webhookId', 'get');
      let webhook = await client.getWebhook(webhookId);
      return {
        output: mapWebhook(webhook),
        message: `Retrieved webhook \`${webhook.id ?? webhookId}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      let eventTypes = requireArray(ctx.input.eventTypes, 'eventTypes', 'create');
      let requestUrl = requireString(ctx.input.requestUrl, 'requestUrl', 'create');
      let webhook = await client.createWebhook(
        pickDefined({
          eventTypes,
          requestUrl,
          condition: conditionFromInput(ctx.input),
          payloadTemplate: ctx.input.payloadTemplate,
          headersTemplate: ctx.input.headersTemplate,
          description: ctx.input.description,
          ignoreSslErrors: ctx.input.ignoreSslErrors,
          doNotRetry: ctx.input.doNotRetry,
          isAdHoc: ctx.input.isAdHoc,
          idempotencyKey: ctx.input.idempotencyKey,
          shouldInterpolateStrings: ctx.input.shouldInterpolateStrings
        })
      );
      return {
        output: mapWebhook(webhook),
        message: `Created webhook \`${webhook.id}\` for events: ${(webhook.eventTypes || []).join(', ')}.`
      };
    }

    if (ctx.input.action === 'update') {
      let webhookId = requireString(ctx.input.webhookId, 'webhookId', 'update');
      let body = pickDefined({
        eventTypes: ctx.input.eventTypes,
        requestUrl: ctx.input.requestUrl,
        condition: conditionFromInput(ctx.input),
        payloadTemplate: ctx.input.payloadTemplate,
        headersTemplate: ctx.input.headersTemplate,
        description: ctx.input.description,
        ignoreSslErrors: ctx.input.ignoreSslErrors,
        doNotRetry: ctx.input.doNotRetry,
        isAdHoc: ctx.input.isAdHoc,
        idempotencyKey: ctx.input.idempotencyKey,
        shouldInterpolateStrings: ctx.input.shouldInterpolateStrings
      });
      ensureAtLeastOne(body, 'update the webhook');
      let webhook = await client.updateWebhook(webhookId, body);
      return {
        output: mapWebhook(webhook),
        message: `Updated webhook \`${webhook.id ?? webhookId}\`.`
      };
    }

    if (ctx.input.action === 'test') {
      let webhookId = requireString(ctx.input.webhookId, 'webhookId', 'test');
      let result = await client.testWebhook(webhookId);
      return {
        output: { webhookId, testResult: result },
        message: `Requested a test delivery for webhook \`${webhookId}\`.`
      };
    }

    let webhookId = requireString(ctx.input.webhookId, 'webhookId', 'delete');
    await client.deleteWebhook(webhookId);
    return {
      output: { webhookId, deleted: true },
      message: `Deleted webhook \`${webhookId}\`.`
    };
  })
  .build();
