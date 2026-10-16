import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireArray } from '../lib/response';
import { spec } from '../spec';

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook for a Stoat channel. Webhooks allow external systems to send messages to the channel without a bot account.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to create the webhook for'),
      name: z.string().describe('Display name for the webhook'),
      avatarId: z.string().optional().describe('Uploaded file ID for the webhook avatar')
    })
  )
  .output(
    z.object({
      webhookId: z.string().describe('ID of the created webhook'),
      webhookToken: z.string().optional().describe('Token for executing the webhook'),
      name: z.string().describe('Name of the webhook'),
      channelId: z.string().describe('ID of the channel')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.createWebhook(ctx.input.channelId, {
      name: ctx.input.name,
      avatar: ctx.input.avatarId
    });

    return {
      output: {
        webhookId: result.id,
        webhookToken: result.token ?? undefined,
        name: result.name,
        channelId: result.channel_id
      },
      message: `Created webhook **${result.name}** (\`${result.id}\`) in channel \`${ctx.input.channelId}\``
    };
  })
  .build();

export let fetchWebhooks = SlateTool.create(spec, {
  name: 'Fetch Webhooks',
  key: 'fetch_webhooks',
  description: `List all webhooks for a Stoat channel. Returns webhook IDs, names, and tokens for execution.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z.string().describe('ID of the channel to list webhooks for')
    })
  )
  .output(
    z.object({
      webhooks: z
        .array(
          z.object({
            webhookId: z.string().describe('ID of the webhook'),
            name: z.string().describe('Name of the webhook'),
            channelId: z.string().describe('Channel the webhook belongs to'),
            creatorId: z.string().describe('ID of the user who created the webhook'),
            webhookToken: z.string().optional().describe('Webhook execution token')
          })
        )
        .describe('List of webhooks')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.fetchWebhooks(ctx.input.channelId);
    let webhooksArray = requireArray(result, 'channel webhooks');

    let webhooks = webhooksArray.map((w: any) => ({
      webhookId: w.id,
      name: w.name,
      channelId: w.channel_id,
      creatorId: w.creator_id,
      webhookToken: w.token ?? undefined
    }));

    return {
      output: { webhooks },
      message: `Found ${webhooks.length} webhook(s) in channel \`${ctx.input.channelId}\``
    };
  })
  .build();

export let executeWebhook = SlateTool.create(spec, {
  name: 'Execute Webhook',
  key: 'execute_webhook',
  description: `Send a message through a Stoat webhook. Messages can include text content, embeds, and a custom username/avatar. Does not require bot authentication.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      webhookId: z.string().describe('ID of the webhook to execute'),
      webhookToken: z.string().describe('Token for the webhook'),
      content: z.string().optional().describe('Text content of the message'),
      username: z.string().optional().describe('Override the webhook display name'),
      avatarUrl: z.string().optional().describe('Override the webhook avatar URL'),
      embeds: z
        .array(
          z.object({
            iconUrl: z.string().optional().describe('URL for the embed icon'),
            url: z.string().optional().describe('URL the embed links to'),
            title: z.string().optional().describe('Embed title'),
            description: z.string().optional().describe('Embed description'),
            colour: z.string().optional().describe('Embed colour')
          })
        )
        .optional()
        .describe('Embeds to include')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the webhook was executed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.executeWebhook(ctx.input.webhookId, ctx.input.webhookToken, {
      content: ctx.input.content,
      username: ctx.input.username,
      avatar: ctx.input.avatarUrl,
      embeds: ctx.input.embeds?.map(e => ({
        icon_url: e.iconUrl,
        url: e.url,
        title: e.title,
        description: e.description,
        colour: e.colour
      }))
    });

    return {
      output: { success: true },
      message: `Executed webhook \`${ctx.input.webhookId}\`${ctx.input.content ? `: "${ctx.input.content.substring(0, 80)}"` : ''}`
    };
  })
  .build();

export let editWebhook = SlateTool.create(spec, {
  name: 'Edit Webhook',
  key: 'edit_webhook',
  description: 'Update an existing channel webhook name, avatar, or permissions.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      webhookId: z.string(),
      name: z.string().optional(),
      avatarId: z.string().optional().describe('Previously uploaded avatar file ID'),
      permissions: z.number().optional().describe('Replacement webhook permission bitfield'),
      removeFields: z.array(z.enum(['Avatar'])).optional()
    })
  )
  .output(z.object({ webhookId: z.string(), name: z.string(), channelId: z.string() }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.permissions !== undefined &&
      (!Number.isSafeInteger(ctx.input.permissions) || ctx.input.permissions < 0)
    ) {
      throw createApiServiceError(
        'Webhook permissions must be a non-negative safe whole number.'
      );
    }
    let webhook = await createClient(ctx).editWebhook(ctx.input.webhookId, {
      name: ctx.input.name,
      avatar: ctx.input.avatarId,
      permissions: ctx.input.permissions,
      remove: ctx.input.removeFields
    });
    return {
      output: { webhookId: webhook.id, name: webhook.name, channelId: webhook.channel_id },
      message: `Updated webhook **${webhook.name}**.`
    };
  })
  .build();

export let deleteWebhook = SlateTool.create(spec, {
  name: 'Delete Webhook',
  key: 'delete_webhook',
  description:
    'Permanently delete an existing channel webhook and revoke its execution token.',
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ webhookId: z.string() }))
  .output(z.object({ success: z.boolean() }))
  .handleInvocation(async ctx => {
    await createClient(ctx).deleteWebhook(ctx.input.webhookId);
    return { output: { success: true }, message: 'Webhook deleted.' };
  })
  .build();
