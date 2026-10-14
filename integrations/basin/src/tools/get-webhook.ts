import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWebhook = SlateTool.create(spec, {
  name: 'Get Webhook',
  key: 'get_webhook',
  description:
    'Retrieve a webhook configuration and delivery failure status. Call list_webhooks to discover webhook IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      webhookId: z
        .number()
        .describe('Webhook ID. Call list_webhooks to discover accessible IDs.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().describe('Webhook ID.'),
      formId: z.number().describe('Associated form ID.'),
      name: z.string().describe('Webhook name.'),
      url: z.string().describe('Delivery URL.'),
      format: z.string().describe('Payload format.'),
      triggerWhenSpam: z.boolean().describe('Whether to deliver spam submissions.'),
      enabled: z.boolean().describe('Whether the webhook is active.'),
      failureCount: z.number().nullable().describe('Delivery failure count, when returned.'),
      lastFailureAt: z.string().nullable().describe('Most recent delivery failure timestamp.'),
      createdAt: z.string().describe('Creation timestamp.'),
      updatedAt: z.string().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let webhook = await client.getFormWebhook(ctx.input.webhookId);
    return {
      output: {
        webhookId: webhook.id,
        formId: webhook.form_id,
        name: webhook.name ?? '',
        url: webhook.url ?? '',
        format: webhook.format ?? '',
        triggerWhenSpam: webhook.trigger_when_spam ?? false,
        enabled: webhook.enabled ?? true,
        failureCount: webhook.failure_count ?? null,
        lastFailureAt: webhook.last_failure_at ?? null,
        createdAt: webhook.created_at ?? '',
        updatedAt: webhook.updated_at ?? ''
      },
      message: `Retrieved webhook **${webhook.name ?? webhook.id}** (ID: ${webhook.id}).`
    };
  })
  .build();
