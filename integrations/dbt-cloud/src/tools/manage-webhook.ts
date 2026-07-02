import { SlateTool } from 'slates';
import { z } from 'zod';
import { dbtCloudServiceError } from '../lib/errors';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let manageWebhookTool = SlateTool.create(spec, {
  name: 'Manage Webhook',
  key: 'manage_webhook',
  description: `Create, update, or delete a dbt Cloud webhook subscription. Webhooks notify external systems when job runs start, complete, or fail. Supports scoping to specific jobs and configuring which event types to listen for.`,
  instructions: [
    'Set action to "create" to register a new webhook, "update" to modify an existing one, or "delete" to remove one.',
    'Available event types: "job.run.started", "job.run.completed", "job.run.errored", "job.run.cancelled".',
    'Leave jobIds empty to trigger on all jobs in the account.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      webhookId: z.string().optional().describe('Webhook ID (required for update and delete)'),
      name: z.string().optional().describe('Webhook name (required for create)'),
      clientUrl: z
        .string()
        .optional()
        .describe('Endpoint URL to receive webhook events (required for create)'),
      eventTypes: z
        .array(
          z.enum([
            'job.run.started',
            'job.run.completed',
            'job.run.errored',
            'job.run.cancelled'
          ])
        )
        .optional()
        .describe('Event types to subscribe to (required for create)'),
      description: z.string().optional().describe('Webhook description'),
      active: z.boolean().optional().describe('Whether the webhook is active'),
      jobIds: z
        .array(z.number())
        .optional()
        .describe('Specific job IDs to trigger on (empty = all jobs)')
    })
  )
  .output(
    z.object({
      webhookId: z.string().optional().describe('Webhook subscription ID'),
      name: z.string().optional().describe('Webhook name'),
      eventTypes: z.array(z.string()).optional().describe('Subscribed event types'),
      clientUrl: z.string().optional().describe('Target endpoint URL'),
      active: z.boolean().optional().describe('Whether the webhook is active'),
      hmacSecret: z
        .string()
        .optional()
        .describe('HMAC secret for validating webhook payloads (only returned on create)'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.clientUrl || !ctx.input.eventTypes) {
        throw dbtCloudServiceError(
          'name, clientUrl, and eventTypes are required when creating a webhook'
        );
      }

      let webhook = await client.createWebhook({
        name: ctx.input.name,
        clientUrl: ctx.input.clientUrl,
        eventTypes: ctx.input.eventTypes,
        description: ctx.input.description,
        active: ctx.input.active,
        jobIds: ctx.input.jobIds
      });

      return {
        output: {
          webhookId: webhook.id,
          name: webhook.name,
          eventTypes: webhook.event_types,
          clientUrl: webhook.client_url,
          active: webhook.active,
          hmacSecret: webhook.hmac_secret
        },
        message: `Created webhook **${webhook.name}** (ID: ${webhook.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.webhookId) {
        throw dbtCloudServiceError('webhookId is required when updating a webhook');
      }

      let webhook = await client.updateWebhook(ctx.input.webhookId, {
        name: ctx.input.name,
        clientUrl: ctx.input.clientUrl,
        eventTypes: ctx.input.eventTypes,
        description: ctx.input.description,
        active: ctx.input.active,
        jobIds: ctx.input.jobIds
      });

      return {
        output: {
          webhookId: webhook.id,
          name: webhook.name,
          eventTypes: webhook.event_types,
          clientUrl: webhook.client_url,
          active: webhook.active
        },
        message: `Updated webhook **${webhook.name}** (ID: ${webhook.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.webhookId) {
        throw dbtCloudServiceError('webhookId is required when deleting a webhook');
      }

      await client.deleteWebhook(ctx.input.webhookId);

      return {
        output: {
          webhookId: ctx.input.webhookId,
          deleted: true
        },
        message: `Deleted webhook **${ctx.input.webhookId}**.`
      };
    }

    throw dbtCloudServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
