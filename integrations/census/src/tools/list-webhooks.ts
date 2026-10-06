import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let listWebhooks = SlateTool.create(spec, {
  name: 'List Webhooks',
  key: 'list_webhooks',
  description: `Lists all webhooks configured in the Census workspace, including their endpoint URLs, subscribed event types, and descriptions.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ workspaceId }))
  .output(
    z.object({
      webhooks: z.array(
        z.object({
          webhookId: z.number().optional().describe('Unique identifier of the webhook.'),
          name: z.string().optional().describe('Name of the webhook.'),
          description: z.string().nullish().describe('Description of the webhook.'),
          endpoint: z.string().describe('HTTPS URL receiving webhook events.'),
          events: z.array(z.string()).optional().describe('Subscribed event types.'),
          createdAt: z.string().nullish().describe('When the webhook was created.'),
          updatedAt: z.string().nullish().describe('When the webhook was last updated.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    let webhooks = await client.listWebhooks();

    let mapped = webhooks.map(w => ({
      webhookId: w.id,
      name: w.name,
      description: w.description,
      endpoint: w.endpoint,
      events: w.events,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt
    }));

    return {
      output: { webhooks: mapped },
      message: `Found **${mapped.length}** webhook(s).`
    };
  })
  .build();
