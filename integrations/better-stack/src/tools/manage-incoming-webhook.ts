import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  nextUrlSchema,
  notificationBody,
  notificationsSchema,
  type ResourceResponse,
  teamNameSchema
} from '../lib/api';
import { UptimeClient } from '../lib/client';
import { webhookRuleBody } from '../lib/webhook-rules';
import { spec } from '../spec';

let incomingWebhookSchema = z.object({
  webhookId: z.string().describe('Incoming webhook ID'),
  name: z.string().nullable().describe('Webhook name'),
  url: z
    .string()
    .nullable()
    .describe(
      'Legacy field; retrieve the secret receiving URL from the webhook in Better Stack'
    ),
  callUrl: z.string().nullable().describe('Legacy field; secret URLs are not returned'),
  paused: z.boolean().optional().describe('Whether incoming payload handling is paused'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageIncomingWebhook = SlateTool.create(spec, {
  name: 'Manage Incoming Webhook',
  key: 'manage_incoming_webhook',
  description: `List, get, create, update, or delete incoming webhooks. Incoming webhooks allow third-party tools to trigger Better Stack incidents by sending JSON payloads with configurable rules for when incidents should be created, acknowledged, or resolved.`,
  tags: { readOnly: false, destructive: true },
  instructions: [
    'Use action "list" to list all incoming webhooks.',
    'Use action "get" to get details of a specific webhook.',
    'Use action "create" to create a new incoming webhook.',
    'Use action "update" to modify an existing webhook.',
    'Use action "delete" to remove a webhook.'
  ]
})
  .input(
    z.object({
      teamName: teamNameSchema,
      ...notificationsSchema.shape,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID (required for get, update, delete)'),
      name: z.string().optional().describe('Webhook name'),
      callUrl: z
        .string()
        .optional()
        .describe('Legacy field unsupported by the current API; omit'),
      paused: z
        .boolean()
        .optional()
        .describe('Pause incoming payload handling and incident notifications'),
      recoveryPeriod: z.number().optional().describe('Recovery period in seconds'),
      confirmationPeriod: z
        .number()
        .optional()
        .describe('Legacy field unsupported by the current API; omit'),
      policyId: z.string().optional().describe('Escalation policy ID'),
      createIncidentRule: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Creation rule, or { type: "all" | "any" | "unused", rules: [...] }. Rules use rule_target, match_type, content and optional target_field. unused matches every payload.'
        ),
      acknowledgeIncidentRule: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Acknowledgement rule, or { type: "all" | "any" | "unused", rules: [...] }, using the provider rule fields'
        ),
      resolveIncidentRule: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Resolution rule, or { type: "all" | "any" | "unused", rules: [...] }, using the provider rule fields'
        ),
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      webhooks: z.array(incomingWebhookSchema).optional().describe('List of webhooks'),
      webhook: incomingWebhookSchema.optional().describe('Single webhook'),
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { action, webhookId } = ctx.input;

    let mapWebhook = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        webhookId: String(item.id),
        name: attrs.name || null,
        url: null,
        callUrl: null,
        paused: attrs.paused ?? undefined,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listIncomingWebhooks({
        nextUrl: ctx.input.nextUrl,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let webhooks = (result.data || []).map(mapWebhook);
      return {
        output: {
          webhooks,
          hasMore: !!result.pagination?.next,
          nextUrl: result.pagination?.next ?? undefined
        },
        message: `Found **${webhooks.length}** incoming webhook(s).`
      };
    }

    if (action === 'get') {
      if (!webhookId) throw createApiServiceError('webhookId is required for get action');
      let result = await client.getIncomingWebhook(webhookId);
      return {
        output: { webhook: mapWebhook(result.data || result) },
        message: `Incoming webhook retrieved.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw createApiServiceError('webhookId is required for delete action');
      await client.deleteIncomingWebhook(webhookId);
      return {
        output: { deleted: true },
        message: `Incoming webhook **${webhookId}** deleted.`
      };
    }

    let body: Record<string, unknown> = notificationBody(ctx.input);
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.callUrl !== undefined || ctx.input.confirmationPeriod !== undefined)
      throw createApiServiceError(
        'The incoming webhook API does not support callUrl or confirmationPeriod. Omit these legacy fields.'
      );
    if (ctx.input.paused !== undefined) body.paused = ctx.input.paused;
    if (ctx.input.recoveryPeriod !== undefined)
      body.recovery_period = ctx.input.recoveryPeriod;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;
    Object.assign(
      body,
      webhookRuleBody(ctx.input.createIncidentRule, 'started'),
      webhookRuleBody(ctx.input.acknowledgeIncidentRule, 'acknowledged'),
      webhookRuleBody(ctx.input.resolveIncidentRule, 'resolved')
    );

    let result: ResourceResponse;
    if (action === 'create') {
      result = await client.createIncomingWebhook(body);
    } else {
      if (!webhookId) throw createApiServiceError('webhookId is required for update action');
      result = await client.updateIncomingWebhook(webhookId, body);
    }

    return {
      output: { webhook: mapWebhook(result.data || result) },
      message: `Incoming webhook ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
