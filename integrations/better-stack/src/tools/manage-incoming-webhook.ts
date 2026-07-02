import { SlateTool } from 'slates';
import { z } from 'zod';
import { UptimeClient } from '../lib/client';
import { spec } from '../spec';

let incomingWebhookSchema = z.object({
  webhookId: z.string().describe('Incoming webhook ID'),
  name: z.string().nullable().describe('Webhook name'),
  url: z.string().nullable().describe('Webhook endpoint URL'),
  callUrl: z.string().nullable().describe('Call URL'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageIncomingWebhook = SlateTool.create(spec, {
  name: 'Manage Incoming Webhook',
  key: 'manage_incoming_webhook',
  description: `List, get, create, update, or delete incoming webhooks. Incoming webhooks allow third-party tools to trigger Better Stack incidents by sending JSON payloads with configurable rules for when incidents should be created, acknowledged, or resolved.`,
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
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID (required for get, update, delete)'),
      name: z.string().optional().describe('Webhook name'),
      callUrl: z.string().optional().describe('Call URL'),
      recoveryPeriod: z.number().optional().describe('Recovery period in seconds'),
      confirmationPeriod: z.number().optional().describe('Confirmation period in seconds'),
      policyId: z.string().optional().describe('Escalation policy ID'),
      createIncidentRule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rules for when to create incidents from payload'),
      acknowledgeIncidentRule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rules for when to acknowledge incidents from payload'),
      resolveIncidentRule: z
        .record(z.string(), z.any())
        .optional()
        .describe('Rules for when to resolve incidents from payload'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      webhooks: z.array(incomingWebhookSchema).optional().describe('List of webhooks'),
      webhook: incomingWebhookSchema.optional().describe('Single webhook'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UptimeClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, webhookId } = ctx.input;

    let mapWebhook = (item: any) => {
      let attrs = item.attributes || item;
      return {
        webhookId: String(item.id),
        name: attrs.name || null,
        url: attrs.url || null,
        callUrl: attrs.call_url || null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listIncomingWebhooks({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let webhooks = (result.data || []).map(mapWebhook);
      return {
        output: { webhooks, hasMore: !!result.pagination?.next },
        message: `Found **${webhooks.length}** incoming webhook(s).`
      };
    }

    if (action === 'get') {
      if (!webhookId) throw new Error('webhookId is required for get action');
      let result = await client.getIncomingWebhook(webhookId);
      return {
        output: { webhook: mapWebhook(result.data || result) },
        message: `Incoming webhook retrieved.`
      };
    }

    if (action === 'delete') {
      if (!webhookId) throw new Error('webhookId is required for delete action');
      await client.deleteIncomingWebhook(webhookId);
      return {
        output: { deleted: true },
        message: `Incoming webhook **${webhookId}** deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.callUrl) body.call_url = ctx.input.callUrl;
    if (ctx.input.recoveryPeriod !== undefined)
      body.recovery_period = ctx.input.recoveryPeriod;
    if (ctx.input.confirmationPeriod !== undefined)
      body.confirmation_period = ctx.input.confirmationPeriod;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;
    if (ctx.input.createIncidentRule) body.cause = ctx.input.createIncidentRule;
    if (ctx.input.acknowledgeIncidentRule)
      body.started_rule = ctx.input.acknowledgeIncidentRule;
    if (ctx.input.resolveIncidentRule) body.resolved_rule = ctx.input.resolveIncidentRule;

    let result: any;
    if (action === 'create') {
      result = await client.createIncomingWebhook(body);
    } else {
      if (!webhookId) throw new Error('webhookId is required for update action');
      result = await client.updateIncomingWebhook(webhookId, body);
    }

    return {
      output: { webhook: mapWebhook(result.data || result) },
      message: `Incoming webhook ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
