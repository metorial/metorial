import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `List form webhooks configured in your Basin account. Webhooks send submission data to external URLs when forms receive submissions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination.'),
      query: z.string().optional().describe('Search by webhook name, ID, URL, or form ID.')
    })
  )
  .output(
    z.object({
      webhooks: z.array(
        z.object({
          webhookId: z.number().describe('Webhook ID.'),
          formId: z.number().describe('Associated form ID.'),
          name: z.string().describe('Webhook name.'),
          url: z.string().describe('Target URL for webhook delivery.'),
          format: z.string().describe('Payload format (json, form-encoded, custom).'),
          triggerWhenSpam: z.boolean().describe('Whether webhooks fire for spam submissions.'),
          enabled: z.boolean().describe('Whether the webhook is active.'),
          createdAt: z.string().describe('Webhook creation timestamp.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listFormWebhooks({
      page: ctx.input.page,
      query: ctx.input.query
    });

    let items = Array.isArray(data) ? data : (data?.items ?? data?.form_webhooks ?? []);

    let webhooks = items.map((w: any) => ({
      webhookId: w.id,
      formId: w.form_id,
      name: w.name ?? '',
      url: w.url ?? '',
      format: w.format ?? '',
      triggerWhenSpam: w.trigger_when_spam ?? false,
      enabled: w.enabled ?? true,
      createdAt: w.created_at ?? ''
    }));

    return {
      output: { webhooks },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();
