import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateWebhook = SlateTool.create(spec, {
  name: 'Update Webhook',
  key: 'update_webhook',
  description: `Update an existing webhook's configuration, including its target URL, payload format, spam behavior, and enabled status.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      webhookId: z.number().describe('ID of the webhook to update.'),
      name: z.string().optional().describe('New name for the webhook.'),
      url: z.string().optional().describe('New target URL for webhook delivery.'),
      format: z.string().optional().describe('Payload format.'),
      triggerWhenSpam: z
        .boolean()
        .optional()
        .describe('Whether to fire for spam submissions.'),
      enabled: z.boolean().optional().describe('Enable or disable the webhook.')
    })
  )
  .output(
    z.object({
      webhookId: z.number().describe('Webhook ID.'),
      formId: z.number().describe('Associated form ID.'),
      name: z.string().describe('Webhook name.'),
      url: z.string().describe('Target URL.'),
      format: z.string().describe('Payload format.'),
      enabled: z.boolean().describe('Whether the webhook is active.'),
      updatedAt: z.string().describe('Last updated timestamp.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.url !== undefined) updateData.url = ctx.input.url;
    if (ctx.input.format !== undefined) updateData.format = ctx.input.format;
    if (ctx.input.triggerWhenSpam !== undefined)
      updateData.trigger_when_spam = ctx.input.triggerWhenSpam;
    if (ctx.input.enabled !== undefined) updateData.enabled = ctx.input.enabled;

    let webhook = await client.updateFormWebhook(ctx.input.webhookId, updateData);

    return {
      output: {
        webhookId: webhook.id,
        formId: webhook.form_id,
        name: webhook.name ?? '',
        url: webhook.url ?? '',
        format: webhook.format ?? '',
        enabled: webhook.enabled ?? true,
        updatedAt: webhook.updated_at ?? ''
      },
      message: `Updated webhook **${webhook.name}** (ID: ${webhook.id}).`
    };
  })
  .build();
