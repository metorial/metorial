import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooksTool = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description:
    'Retrieve Lemon Squeezy webhooks. Filter by store and inspect endpoint URL, subscribed event types, last delivery time, and test mode.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      storeId: z.string().optional().describe('Filter webhooks by store ID'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      webhooks: z.array(
        z.object({
          webhookId: z.string(),
          storeId: z.number(),
          url: z.string(),
          events: z.array(z.string()),
          lastSentAt: z.string().nullable(),
          testMode: z.boolean(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.listWebhooks({
      storeId: ctx.input.storeId,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let webhooks = (response.data || []).map((webhook: any) => ({
      webhookId: webhook.id,
      storeId: webhook.attributes.store_id,
      url: webhook.attributes.url,
      events: webhook.attributes.events,
      lastSentAt: webhook.attributes.last_sent_at,
      testMode: webhook.attributes.test_mode,
      createdAt: webhook.attributes.created_at,
      updatedAt: webhook.attributes.updated_at
    }));

    let hasMore =
      !!response.meta?.page?.lastPage &&
      response.meta?.page?.currentPage < response.meta?.page?.lastPage;

    return {
      output: { webhooks, hasMore },
      message: `Found **${webhooks.length}** webhook(s).`
    };
  })
  .build();
