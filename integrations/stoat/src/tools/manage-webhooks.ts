import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createWebhook = SlateTool.create(spec, {
  name: 'Create Webhook',
  key: 'create_webhook',
  description: `Create a new webhook for a Revolt channel. Webhooks allow external systems to send messages to the channel without a bot account.`,
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
  description: `List all webhooks for a Revolt channel. Returns webhook IDs, names, and tokens for execution.`,
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
    let webhooksArray = Array.isArray(result) ? result : [];

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
  description: `Send a message through a Revolt webhook. Messages can include text content, embeds, and a custom username/avatar. Does not require bot authentication.`,
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
