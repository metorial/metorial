import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook on a form. Webhooks send an HTTP POST with submission data to a target URL when a form receives a submission. Supports JSON, form-encoded, and custom payload formats.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      formId: z.number().describe('ID of the form to attach the webhook to.'),
      name: z.string().describe('Name for the webhook.'),
      url: z.string().describe('Target URL to receive webhook POST requests.'),
      format: z
        .string()
        .optional()
        .describe('Payload format: "json", "form_encoded", or a custom template format.'),
      triggerWhenSpam: z
        .boolean()
        .optional()
        .describe('Whether to fire webhooks for spam submissions. Defaults to false.'),
      enabled: z
        .boolean()
        .optional()
        .describe('Whether the webhook is active. Defaults to true.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().describe('ID of the created webhook.'),
      formId: z.number().describe('Associated form ID.'),
      name: z.string().describe('Webhook name.'),
      url: z.string().describe('Target URL.'),
      format: z.string().describe('Payload format.'),
      enabled: z.boolean().describe('Whether the webhook is active.'),
      createdAt: z.string().describe('Creation timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let webhook = await client.createFormWebhook({
      form_id: ctx.input.formId,
      name: ctx.input.name,
      url: ctx.input.url,
      format: ctx.input.format,
      trigger_when_spam: ctx.input.triggerWhenSpam,
      enabled: ctx.input.enabled
    });

    return {
      output: {
        webhookId: webhook.id,
        formId: webhook.form_id,
        name: webhook.name ?? '',
        url: webhook.url ?? '',
        format: webhook.format ?? '',
        enabled: webhook.enabled ?? true,
        createdAt: webhook.created_at ?? ''
      },
      message: `Created webhook **${webhook.name}** (ID: ${webhook.id}) on form ${webhook.form_id} → ${webhook.url}`
    };
  })
  .build();
