import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageWebhooksTool = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, or delete webhooks on a JotForm form. Webhooks send HTTP POST notifications to a URL when a form submission is made through the form UI.`,
  instructions: [
    'To list webhooks, provide only the formId.',
    'To add a webhook, provide formId and webhookUrl.',
    'To delete a webhook, provide formId and deleteWebhookId.',
    'Webhooks are only triggered for UI submissions, not API-created submissions.'
  ]
})
  .input(
    z.object({
      formId: z.string().describe('ID of the form to manage webhooks for'),
      webhookUrl: z.string().optional().describe('URL to register as a new webhook endpoint'),
      deleteWebhookId: z.string().optional().describe('ID of the webhook to remove')
    })
  )
  .output(
    z.object({
      webhooks: z
        .record(z.string(), z.string())
        .describe('Current webhooks on the form (webhook ID → URL)'),
      webhookCreated: z.boolean().describe('Whether a new webhook was created'),
      webhookDeleted: z.boolean().describe('Whether a webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let webhookCreated = false;
    let webhookDeleted = false;

    if (ctx.input.webhookUrl) {
      await client.createFormWebhook(ctx.input.formId, ctx.input.webhookUrl);
      webhookCreated = true;
    }

    if (ctx.input.deleteWebhookId) {
      await client.deleteFormWebhook(ctx.input.formId, ctx.input.deleteWebhookId);
      webhookDeleted = true;
    }

    let webhooksData = await client.listFormWebhooks(ctx.input.formId);
    let webhooks: Record<string, string> = {};
    if (webhooksData && typeof webhooksData === 'object') {
      for (let [key, value] of Object.entries(webhooksData)) {
        webhooks[key] = String(value);
      }
    }

    let actions: string[] = [];
    if (webhookCreated) actions.push('registered a new webhook');
    if (webhookDeleted) actions.push('deleted a webhook');
    if (actions.length === 0) actions.push('listed webhooks');

    return {
      output: { webhooks, webhookCreated, webhookDeleted },
      message: `Form ${ctx.input.formId}: ${actions.join(', ')}. ${Object.keys(webhooks).length} webhook(s) active.`
    };
  })
  .build();
