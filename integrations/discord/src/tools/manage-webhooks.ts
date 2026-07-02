import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let webhookSchema = z.object({
  webhookId: z.string().describe('Webhook ID'),
  name: z.string().nullable().optional().describe('Webhook name'),
  channelId: z.string().nullable().optional().describe('Channel ID the webhook belongs to'),
  guildId: z.string().nullable().optional().describe('Guild ID the webhook belongs to'),
  webhookToken: z
    .string()
    .nullable()
    .optional()
    .describe('Webhook token (used for executing)'),
  webhookUrl: z.string().nullable().optional().describe('Full webhook URL for execution')
});

let embedSchema = z.object({
  title: z.string().optional().describe('Embed title'),
  description: z.string().optional().describe('Embed description'),
  url: z.string().optional().describe('Embed URL'),
  color: z.number().optional().describe('Embed color as decimal integer'),
  footer: z
    .object({
      text: z.string(),
      icon_url: z.string().optional()
    })
    .optional()
    .describe('Embed footer'),
  image: z
    .object({
      url: z.string()
    })
    .optional()
    .describe('Embed image'),
  thumbnail: z
    .object({
      url: z.string()
    })
    .optional()
    .describe('Embed thumbnail'),
  author: z
    .object({
      name: z.string(),
      url: z.string().optional(),
      icon_url: z.string().optional()
    })
    .optional()
    .describe('Embed author'),
  fields: z
    .array(
      z.object({
        name: z.string(),
        value: z.string(),
        inline: z.boolean().optional()
      })
    )
    .optional()
    .describe('Embed fields')
});

export let manageWebhooks = SlateTool.create(spec, {
  name: 'Manage Webhooks',
  key: 'manage_webhooks',
  description: `List, create, update, delete, or execute webhooks in a Discord channel or guild. Webhooks allow external services to send messages to Discord channels without a bot user.`,
  instructions: [
    'To **list webhooks for a channel**, set action to "list_channel" and provide the channelId.',
    'To **list webhooks for a guild**, set action to "list_guild" and provide the guildId.',
    'To **create** a webhook, set action to "create" and provide the channelId and a name.',
    'To **update** a webhook, set action to "update" and provide the webhookId plus fields to change (name, avatar, channelId).',
    'To **delete** a webhook, set action to "delete" and provide the webhookId.',
    'To **execute** a webhook (send a message), set action to "execute" and provide the webhookId, webhookToken, and message content or embeds.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageWebhooks)
  .input(
    z.object({
      action: z
        .enum(['list_channel', 'list_guild', 'create', 'update', 'delete', 'execute'])
        .describe('The webhook action to perform'),
      channelId: z
        .string()
        .optional()
        .describe(
          'Channel ID (required for list_channel and create; optional for update to move webhook)'
        ),
      guildId: z.string().optional().describe('Guild ID (required for list_guild)'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook ID (required for update, delete, execute)'),
      webhookToken: z.string().optional().describe('Webhook token (required for execute)'),
      name: z
        .string()
        .optional()
        .describe('Webhook name (required for create, optional for update)'),
      avatar: z
        .string()
        .optional()
        .describe(
          'Base64-encoded image data URI for the webhook avatar (for create or update)'
        ),
      content: z.string().optional().describe('Message content to send (for execute)'),
      username: z
        .string()
        .optional()
        .describe('Override the webhook display name (for execute)'),
      avatarUrl: z
        .string()
        .optional()
        .describe('Override the webhook avatar URL (for execute)'),
      tts: z
        .boolean()
        .optional()
        .describe('Whether the message is text-to-speech (for execute)'),
      embeds: z
        .array(embedSchema)
        .optional()
        .describe('Array of embed objects to send (for execute)')
    })
  )
  .output(
    z.object({
      webhook: webhookSchema
        .optional()
        .describe('Webhook details (for create/update actions)'),
      webhooks: z
        .array(webhookSchema)
        .optional()
        .describe('List of webhooks (for list actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the webhook was deleted (for delete action)'),
      messageId: z.string().optional().describe('ID of the message sent (for execute action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action } = ctx.input;

    let mapWebhook = (w: any) => ({
      webhookId: w.id,
      name: w.name ?? null,
      channelId: w.channel_id ?? null,
      guildId: w.guild_id ?? null,
      webhookToken: w.token ?? null,
      webhookUrl: w.token ? `https://discord.com/api/webhooks/${w.id}/${w.token}` : null
    });

    if (action === 'list_channel') {
      if (!ctx.input.channelId)
        throw discordServiceError('channelId is required for list_channel action');

      let webhooks = await client.getChannelWebhooks(ctx.input.channelId);
      let mapped = webhooks.map(mapWebhook);

      return {
        output: { webhooks: mapped },
        message: `Found **${mapped.length}** webhook(s) in channel \`${ctx.input.channelId}\`.`
      };
    }

    if (action === 'list_guild') {
      if (!ctx.input.guildId)
        throw discordServiceError('guildId is required for list_guild action');

      let webhooks = await client.getGuildWebhooks(ctx.input.guildId);
      let mapped = webhooks.map(mapWebhook);

      return {
        output: { webhooks: mapped },
        message: `Found **${mapped.length}** webhook(s) in guild \`${ctx.input.guildId}\`.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.channelId)
        throw discordServiceError('channelId is required for create action');
      if (!ctx.input.name) throw discordServiceError('name is required for create action');

      let webhook = await client.createWebhook(ctx.input.channelId, {
        name: ctx.input.name,
        avatar: ctx.input.avatar
      });

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Created webhook **${ctx.input.name}** in channel \`${ctx.input.channelId}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.webhookId)
        throw discordServiceError('webhookId is required for update action');

      let data: Record<string, any> = {};
      if (ctx.input.name !== undefined) data.name = ctx.input.name;
      if (ctx.input.avatar !== undefined) data.avatar = ctx.input.avatar;
      if (ctx.input.channelId !== undefined) data.channel_id = ctx.input.channelId;

      let webhook = await client.modifyWebhook(ctx.input.webhookId, data);

      return {
        output: { webhook: mapWebhook(webhook) },
        message: `Updated webhook \`${ctx.input.webhookId}\`${ctx.input.name ? ` (renamed to **${ctx.input.name}**)` : ''}.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.webhookId)
        throw discordServiceError('webhookId is required for delete action');

      await client.deleteWebhook(ctx.input.webhookId);

      return {
        output: { deleted: true },
        message: `Deleted webhook \`${ctx.input.webhookId}\`.`
      };
    }

    // action === 'execute'
    if (!ctx.input.webhookId)
      throw discordServiceError('webhookId is required for execute action');
    if (!ctx.input.webhookToken)
      throw discordServiceError('webhookToken is required for execute action');
    if (!ctx.input.content && !ctx.input.embeds?.length) {
      throw discordServiceError('content or embeds is required for execute action');
    }

    let executeData: Record<string, any> = {};
    if (ctx.input.content !== undefined) executeData.content = ctx.input.content;
    if (ctx.input.username !== undefined) executeData.username = ctx.input.username;
    if (ctx.input.avatarUrl !== undefined) executeData.avatar_url = ctx.input.avatarUrl;
    if (ctx.input.tts !== undefined) executeData.tts = ctx.input.tts;
    if (ctx.input.embeds !== undefined) executeData.embeds = ctx.input.embeds;

    let result = await client.executeWebhook(
      ctx.input.webhookId,
      ctx.input.webhookToken,
      executeData
    );

    return {
      output: { messageId: result.id },
      message: `Executed webhook \`${ctx.input.webhookId}\` — message \`${result.id}\` sent.`
    };
  })
  .build();
