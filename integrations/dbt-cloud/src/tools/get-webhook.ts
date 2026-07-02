import { SlateTool } from 'slates';
import { z } from 'zod';
import { normalizeWebhookJobIds } from '../lib/client';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getWebhookTool = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description: `Retrieve a dbt Cloud webhook subscription by ID, including subscribed events, target URL, active state, and scoped job IDs when available.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      webhookId: z.string().describe('Webhook subscription ID to retrieve')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('Webhook subscription ID'),
      name: z.string().optional().describe('Webhook name'),
      description: z.string().optional().describe('Webhook description'),
      eventTypes: z.array(z.string()).optional().describe('Subscribed event types'),
      clientUrl: z.string().optional().describe('Target endpoint URL'),
      active: z.boolean().optional().describe('Whether the webhook is active'),
      jobIds: z.array(z.number()).optional().describe('Scoped job IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let webhook = await client.getWebhook(ctx.input.webhookId);

    return {
      output: {
        webhookId: webhook.id,
        name: webhook.name,
        description: webhook.description,
        eventTypes: webhook.event_types,
        clientUrl: webhook.client_url,
        active: webhook.active,
        jobIds: normalizeWebhookJobIds(webhook.job_ids)
      },
      message: `Retrieved webhook **${webhook.name || webhook.id}**.`
    };
  })
  .build();
