import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let webhookEventTypes = z.enum([
  'branch.ready',
  'branch.sleeping',
  'branch.anomaly',
  'branch.primary_promoted',
  'branch.out_of_memory',
  'branch.start_maintenance',
  'deploy_request.opened',
  'deploy_request.queued',
  'deploy_request.in_progress',
  'deploy_request.pending_cutover',
  'deploy_request.schema_applied',
  'deploy_request.errored',
  'deploy_request.reverted',
  'deploy_request.closed',
  'cluster.storage',
  'keyspace.storage',
  'database.access_request'
]);

export let manageWebhook = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, list, update, test, or delete webhooks for a PlanetScale database. Webhooks send HTTP POST callbacks when specific events occur. Each database supports up to 5 webhooks.`,
  instructions: [
    'Use action "list" to list all webhooks for a database.',
    'Use action "create" to register a new webhook URL with selected event types.',
    'Use action "get" to get details about a specific webhook.',
    'Use action "update" to change the URL, enabled state, or event types.',
    'Use action "test" to send a test event to the webhook.',
    'Use action "delete" to remove a webhook.'
  ],
  constraints: [
    'Maximum of 5 webhooks per database.',
    'Webhook URLs must use HTTPS.',
    'Test webhook rate limit: 1 per 20 seconds.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      action: z
        .enum(['list', 'create', 'get', 'update', 'test', 'delete'])
        .describe('Action to perform'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID (required for get, update, test, delete)'),
      url: z
        .string()
        .optional()
        .describe('Webhook HTTPS URL (required for create, optional for update)'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is enabled (used with create/update)'),
      events: z.array(webhookEventTypes).optional().describe('Event types to subscribe to')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string(),
            url: z.string().optional(),
            enabled: z.boolean().optional(),
            events: z.array(z.string()).optional(),
            lastSentAt: z.string().optional(),
            lastSentSuccess: z.boolean().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional(),
      webhook: z
        .object({
          webhookId: z.string(),
          url: z.string().optional(),
          secret: z.string().optional().describe('Webhook signing secret (only on creation)'),
          enabled: z.boolean().optional(),
          events: z.array(z.string()).optional(),
          lastSentAt: z.string().optional(),
          lastSentSuccess: z.boolean().optional(),
          lastSentResult: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      testSent: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let { databaseName, action } = ctx.input;

    if (action === 'list') {
      let result = await client.listWebhooks(databaseName);
      let webhooks = result.data.map((w: any) => ({
        webhookId: w.id,
        url: w.url,
        enabled: w.enabled,
        events: w.events,
        lastSentAt: w.last_sent_at,
        lastSentSuccess: w.last_sent_success,
        createdAt: w.created_at
      }));

      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook(s) for database **${databaseName}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteWebhook(databaseName, ctx.input.webhookId!);
      return {
        output: { deleted: true },
        message: `Deleted webhook **${ctx.input.webhookId}** from database **${databaseName}**.`
      };
    }

    if (action === 'test') {
      await client.testWebhook(databaseName, ctx.input.webhookId!);
      return {
        output: { testSent: true },
        message: `Sent test event to webhook **${ctx.input.webhookId}**.`
      };
    }

    let wh: any;
    switch (action) {
      case 'create':
        wh = await client.createWebhook(databaseName, {
          url: ctx.input.url!,
          enabled: ctx.input.enabled,
          events: ctx.input.events
        });
        break;
      case 'get':
        wh = await client.getWebhook(databaseName, ctx.input.webhookId!);
        break;
      case 'update':
        wh = await client.updateWebhook(databaseName, ctx.input.webhookId!, {
          url: ctx.input.url,
          enabled: ctx.input.enabled,
          events: ctx.input.events
        });
        break;
    }

    return {
      output: {
        webhook: {
          webhookId: wh.id,
          url: wh.url,
          secret: wh.secret,
          enabled: wh.enabled,
          events: wh.events,
          lastSentAt: wh.last_sent_at,
          lastSentSuccess: wh.last_sent_success,
          lastSentResult: wh.last_sent_result,
          createdAt: wh.created_at,
          updatedAt: wh.updated_at
        }
      },
      message:
        action === 'create'
          ? `Created webhook for **${wh.url}** on database **${databaseName}**.`
          : `${action === 'get' ? 'Retrieved' : 'Updated'} webhook **${wh.id}**.`
    };
  });
