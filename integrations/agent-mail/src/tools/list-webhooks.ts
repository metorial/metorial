import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description:
    'Discover existing email webhooks, their delivery URLs, event subscriptions, enabled state, and pod or inbox filters before updating or deleting them.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      limit: z.number().int().min(1).optional().describe('Maximum webhooks per page.'),
      pageToken: z.string().optional().describe('Cursor from a previous response.'),
      ascending: z.boolean().optional().describe('Sort oldest first when true.')
    })
  )
  .output(
    z.object({
      count: z.number(),
      nextPageToken: z.string().optional(),
      webhooks: z.array(
        z.object({
          webhookId: z.string(),
          url: z.string(),
          enabled: z.boolean(),
          eventTypes: z.array(z.string()).optional(),
          podIds: z.array(z.string()).optional(),
          inboxIds: z.array(z.string()).optional(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      podId: ctx.config.podId
    }).listWebhooks(ctx.input);
    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        webhooks: result.webhooks.map(webhook => ({
          webhookId: webhook.webhook_id,
          url: webhook.url,
          enabled: webhook.enabled,
          eventTypes: webhook.event_types,
          podIds: webhook.pod_ids,
          inboxIds: webhook.inbox_ids,
          createdAt: webhook.created_at,
          updatedAt: webhook.updated_at
        }))
      },
      message: `Found ${result.count} webhooks.`
    };
  })
  .build();
