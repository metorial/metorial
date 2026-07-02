import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageNotificationsTool = SlateTool.create(spec, {
  name: 'Manage Notifications',
  key: 'manage_notifications',
  description: `List, create, or delete notification policies and webhook destinations. Notification policies define what events trigger alerts and how they are delivered. View notification history to see past alerts.`,
  instructions: [
    'Common alert types: dos_attack_l7, dos_attack_l4, health_check_status_notification, certificate_alert_expiration_type, workers_alert, usage_alert.',
    'Mechanisms define delivery: email, webhook, or pagerduty. Each mechanism takes an array of objects with an id field.',
    'For email mechanisms, the id is the email address. For webhooks, use the webhook destination ID.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_policies',
          'create_policy',
          'delete_policy',
          'list_webhooks',
          'create_webhook',
          'delete_webhook',
          'list_history'
        ])
        .describe('Operation to perform'),
      accountId: z.string().optional().describe('Account ID (uses config if not provided)'),
      policyId: z.string().optional().describe('Notification policy ID'),
      webhookId: z.string().optional().describe('Webhook destination ID'),
      name: z.string().optional().describe('Name for policy or webhook'),
      alertType: z.string().optional().describe('Alert type for notification policy'),
      enabled: z.boolean().optional().describe('Whether the policy is enabled'),
      description: z.string().optional().describe('Description of the policy'),
      mechanisms: z
        .record(z.string(), z.array(z.object({ id: z.string() })))
        .optional()
        .describe('Delivery mechanisms (email, webhooks, pagerduty)'),
      filters: z
        .record(z.string(), z.array(z.string()))
        .optional()
        .describe('Filters for the notification policy'),
      webhookUrl: z
        .string()
        .optional()
        .describe('Webhook URL for creating a webhook destination'),
      since: z.string().optional().describe('Start date for history (ISO 8601)'),
      before: z.string().optional().describe('End date for history (ISO 8601)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      policies: z
        .array(
          z.object({
            policyId: z.string(),
            name: z.string(),
            alertType: z.string().optional(),
            enabled: z.boolean().optional(),
            description: z.string().optional()
          })
        )
        .optional(),
      policy: z
        .object({
          policyId: z.string()
        })
        .optional(),
      webhooks: z
        .array(
          z.object({
            webhookId: z.string(),
            name: z.string(),
            url: z.string().optional(),
            type: z.string().optional()
          })
        )
        .optional(),
      webhook: z
        .object({
          webhookId: z.string()
        })
        .optional(),
      history: z
        .array(
          z.object({
            alertId: z.string().optional(),
            name: z.string().optional(),
            alertType: z.string().optional(),
            sentAt: z.string().optional()
          })
        )
        .optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let accountId = ctx.input.accountId || ctx.config.accountId;
    if (!accountId) throw cloudflareServiceError('accountId is required');

    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'list_policies') {
      let response = await client.listNotificationPolicies(accountId);
      let policies = response.result.map((p: any) => ({
        policyId: p.id,
        name: p.name,
        alertType: p.alert_type,
        enabled: p.enabled,
        description: p.description
      }));
      return {
        output: { policies },
        message: `Found **${policies.length}** notification policy(ies).`
      };
    }

    if (action === 'create_policy') {
      if (!ctx.input.name || !ctx.input.alertType || !ctx.input.mechanisms) {
        throw cloudflareServiceError('name, alertType, and mechanisms are required');
      }
      let response = await client.createNotificationPolicy(accountId, {
        name: ctx.input.name,
        alertType: ctx.input.alertType,
        enabled: ctx.input.enabled,
        description: ctx.input.description,
        mechanisms: ctx.input.mechanisms,
        filters: ctx.input.filters
      });
      return {
        output: { policy: { policyId: response.result.id } },
        message: `Created notification policy **${ctx.input.name}** for alert type \`${ctx.input.alertType}\`.`
      };
    }

    if (action === 'delete_policy') {
      if (!ctx.input.policyId) throw cloudflareServiceError('policyId is required');
      await client.deleteNotificationPolicy(accountId, ctx.input.policyId);
      return {
        output: { deleted: true },
        message: `Deleted notification policy \`${ctx.input.policyId}\`.`
      };
    }

    if (action === 'list_webhooks') {
      let response = await client.listNotificationWebhooks(accountId);
      let webhooks = response.result.map((w: any) => ({
        webhookId: w.id,
        name: w.name,
        url: w.url,
        type: w.type
      }));
      return {
        output: { webhooks },
        message: `Found **${webhooks.length}** webhook destination(s).`
      };
    }

    if (action === 'create_webhook') {
      if (!ctx.input.name || !ctx.input.webhookUrl) {
        throw cloudflareServiceError('name and webhookUrl are required');
      }
      let response = await client.createNotificationWebhook(accountId, {
        name: ctx.input.name,
        url: ctx.input.webhookUrl
      });
      return {
        output: { webhook: { webhookId: response.result.id } },
        message: `Created webhook destination **${ctx.input.name}**.`
      };
    }

    if (action === 'delete_webhook') {
      if (!ctx.input.webhookId) throw cloudflareServiceError('webhookId is required');
      await client.deleteNotificationWebhook(accountId, ctx.input.webhookId);
      return {
        output: { deleted: true },
        message: `Deleted webhook destination \`${ctx.input.webhookId}\`.`
      };
    }

    if (action === 'list_history') {
      let response = await client.listNotificationHistory(accountId, {
        since: ctx.input.since,
        before: ctx.input.before,
        page: ctx.input.page
      });
      let history = response.result.map((h: any) => ({
        alertId: h.id,
        name: h.name,
        alertType: h.alert_type,
        sentAt: h.sent
      }));
      return {
        output: { history },
        message: `Found **${history.length}** notification history entries.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
