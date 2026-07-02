import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Chameleon webhook ID'),
  url: z.string().optional().describe('Target URL for POST requests'),
  name: z.string().optional().describe('Webhook label'),
  topics: z.array(z.string()).optional().describe('Subscribed event topics'),
  lastItemAt: z.string().nullable().optional().describe('Most recent POST timestamp'),
  lastItemState: z.string().optional().describe('Last result status: valid or error'),
  lastItemError: z.string().optional().describe('Details on last error'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let mapWebhook = (w: Record<string, unknown>) => ({
  webhookId: w.id as string,
  url: w.uid as string | undefined,
  name: w.name as string | undefined,
  topics: w.topics as string[] | undefined,
  lastItemAt: w.last_item_at as string | null | undefined,
  lastItemState: w.last_item_state as string | undefined,
  lastItemError: w.last_item_error as string | undefined,
  createdAt: w.created_at as string | undefined
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, or delete Chameleon outgoing webhook subscriptions.
Webhooks receive POST requests when specified events occur (tour/microsurvey interactions, HelpBar events, etc.).
Available topics include: tour.started, tour.completed, tour.exited, tour.snoozed, tour.button.clicked, survey.started, survey.completed, survey.exited, survey.snoozed, survey.button.clicked, response.finished, helpbar.search, helpbar.answer, helpbar.item.action, helpbar.item.error, and more.`,
  constraints: [
    'Maximum 5 webhook subscriptions per account.',
    'Microsurvey submitted webhook is available on all plans. Other topics require the Growth Plan.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      // Create params
      url: z.string().optional().describe('HTTPS endpoint URL for webhook delivery'),
      topics: z
        .array(z.string())
        .optional()
        .describe('Array of webhook event topics to subscribe to'),
      experienceIds: z
        .array(z.string())
        .optional()
        .describe('Array of experience IDs to filter events'),
      // Delete params
      webhookId: z.string().optional().describe('Webhook ID to delete')
    })
  )
  .output(
    z.object({
      webhook: webhookSchema.optional().describe('Created webhook'),
      webhooks: z.array(webhookSchema).optional().describe('Array of webhooks'),
      deleted: z.boolean().optional().describe('Whether the webhook was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.action === 'create') {
      let result = await client.createWebhook({
        url: ctx.input.url!,
        topics: ctx.input.topics!,
        experienceIds: ctx.input.experienceIds
      });
      return {
        output: { webhook: mapWebhook(result) },
        message: `Webhook created for **${ctx.input.topics!.length}** topic(s) pointing to ${ctx.input.url}.`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteWebhook(ctx.input.webhookId!);
      return {
        output: { deleted: true },
        message: `Webhook **${ctx.input.webhookId}** has been deleted.`
      };
    }

    // list
    let result = await client.listWebhooks();
    let webhooks = (result.webhooks || []).map(mapWebhook);
    return {
      output: { webhooks },
      message: `Returned **${webhooks.length}** webhooks.`
    };
  })
  .build();
