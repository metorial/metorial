import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let notificationWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Notification Webhook',
  key: 'notification_webhook',
  description:
    'Receives Cloudflare notification alerts via webhook. Covers DDoS attacks, health check status changes, SSL certificate events, usage alerts, Workers errors, and more.'
})
  .input(
    z.object({
      alertType: z.string().describe('Type of alert that was triggered'),
      alertId: z.string().describe('Unique identifier for this alert instance'),
      policyName: z.string().optional().describe('Name of the notification policy'),
      policyDescription: z
        .string()
        .optional()
        .describe('Description of the notification policy'),
      alertBody: z.string().optional().describe('Alert message body'),
      timestamp: z.string().optional().describe('When the alert was sent'),
      accountName: z.string().optional().describe('Account name'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      alertType: z
        .string()
        .describe('Type of alert (e.g. dos_attack_l7, health_check_status_notification)'),
      alertId: z.string().describe('Unique identifier for this alert'),
      policyName: z
        .string()
        .optional()
        .describe('Name of the notification policy that triggered'),
      alertBody: z.string().optional().describe('Alert message content'),
      timestamp: z.string().optional().describe('When the alert was triggered'),
      accountName: z.string().optional().describe('Associated account name')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let accountId = ctx.config.accountId;
      if (!accountId)
        throw cloudflareServiceError(
          'accountId is required in config for webhook registration'
        );

      let client = new Client(ctx.auth);
      let response = await client.createNotificationWebhook(accountId, {
        name: `Slates Webhook - ${new Date().toISOString().split('T')[0]}`,
        url: ctx.input.webhookBaseUrl
      });

      return {
        registrationDetails: {
          webhookId: response.result.id,
          accountId
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let { webhookId, accountId } = ctx.input.registrationDetails as {
        webhookId: string;
        accountId: string;
      };
      let client = new Client(ctx.auth);
      await client.deleteNotificationWebhook(accountId, webhookId);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        let text = await ctx.request.text();
        body = { text };
      }

      let alertType = body.alert_type || body.data?.alert_type || 'unknown';
      let alertId = body.id || body.alert_id || `${alertType}-${Date.now()}`;

      return {
        inputs: [
          {
            alertType,
            alertId,
            policyName: body.policy_name || body.name,
            policyDescription: body.policy_description || body.description,
            alertBody: body.text || body.data?.text || body.message,
            timestamp: body.ts || body.sent || body.timestamp || new Date().toISOString(),
            accountName: body.account_name || body.data?.account_name,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `notification.${ctx.input.alertType}`,
        id: ctx.input.alertId,
        output: {
          alertType: ctx.input.alertType,
          alertId: ctx.input.alertId,
          policyName: ctx.input.policyName,
          alertBody: ctx.input.alertBody,
          timestamp: ctx.input.timestamp,
          accountName: ctx.input.accountName
        }
      };
    }
  })
  .build();
