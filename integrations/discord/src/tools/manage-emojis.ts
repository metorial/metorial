import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let emojiOutputSchema = z.object({
  emojiId: z.string().nullable().describe('Emoji ID, null for standard emoji objects'),
  name: z.string().nullable().describe('Emoji name'),
  roles: z.array(z.string()).describe('Role IDs allowed to use this emoji'),
  userId: z.string().nullable().describe('User ID of the creator when available'),
  requireColons: z.boolean().nullable().describe('Whether the emoji requires colons'),
  managed: z.boolean().nullable().describe('Whether the emoji is managed'),
  animated: z.boolean().nullable().describe('Whether the emoji is animated'),
  available: z.boolean().nullable().describe('Whether the emoji is available'),
  imageUrl: z.string().nullable().describe('CDN URL for the emoji when it has an ID')
});

let formatEmoji = (emoji: any) => {
  let extension = emoji.animated ? 'gif' : 'webp';
  return {
    emojiId: emoji.id ?? null,
    name: emoji.name ?? null,
    roles: emoji.roles ?? [],
    userId: emoji.user?.id ?? null,
    requireColons: emoji.require_colons ?? null,
    managed: emoji.managed ?? null,
    animated: emoji.animated ?? null,
    available: emoji.available ?? null,
    imageUrl: emoji.id ? `https://cdn.discordapp.com/emojis/${emoji.id}.${extension}` : null
  };
};

export let manageEmojis = SlateTool.create(spec, {
  name: 'Manage Emojis',
  key: 'manage_emojis',
  description: 'List, get, create, update, or delete custom guild emojis in Discord.',
  instructions: [
    'Use action "list" to retrieve custom emojis in a guild.',
    'Use action "get" with emojiId to retrieve one custom emoji.',
    'Use action "create" with name and image. Image must be a Discord image data URI under Discord emoji size limits.',
    'Use action "update" with emojiId and at least one of name or roles.',
    'Use action "delete" with emojiId to remove a custom emoji.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageEmojis)
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Emoji action to perform'),
      guildId: z.string().describe('Guild ID'),
      emojiId: z
        .string()
        .optional()
        .describe('Emoji ID, required for get/update/delete actions'),
      name: z.string().optional().describe('Emoji name for create/update'),
      image: z
        .string()
        .optional()
        .describe('Image data URI for create, such as data:image/png;base64,...'),
      roles: z.array(z.string()).optional().describe('Role IDs allowed to use the emoji')
    })
  )
  .output(
    z.object({
      emoji: emojiOutputSchema.optional().describe('Emoji returned by get/create/update'),
      emojis: z.array(emojiOutputSchema).optional().describe('Emojis returned by list'),
      success: z.boolean().optional().describe('Whether delete succeeded'),
      emojiId: z.string().optional().describe('Deleted emoji ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let input = ctx.input;

    if (input.action === 'list') {
      let emojis = await client.listGuildEmojis(input.guildId);
      let mapped = emojis.map(formatEmoji);
      return {
        output: { emojis: mapped },
        message: `Found ${mapped.length} custom emoji(s) in guild \`${input.guildId}\`.`
      };
    }

    if (input.action === 'get') {
      if (!input.emojiId) {
        throw discordServiceError('emojiId is required for get action');
      }

      let emoji = await client.getGuildEmoji(input.guildId, input.emojiId);
      return {
        output: { emoji: formatEmoji(emoji) },
        message: `Retrieved emoji \`${input.emojiId}\` from guild \`${input.guildId}\`.`
      };
    }

    if (input.action === 'create') {
      if (!input.name) {
        throw discordServiceError('name is required for create action');
      }
      if (!input.image) {
        throw discordServiceError('image is required for create action');
      }

      let emoji = await client.createGuildEmoji(input.guildId, {
        name: input.name,
        image: input.image,
        roles: input.roles
      });

      return {
        output: { emoji: formatEmoji(emoji) },
        message: `Created emoji **${emoji.name}** in guild \`${input.guildId}\`.`
      };
    }

    if (input.action === 'update') {
      if (!input.emojiId) {
        throw discordServiceError('emojiId is required for update action');
      }
      if (input.name === undefined && input.roles === undefined) {
        throw discordServiceError('Provide name or roles to update an emoji');
      }

      let data: Record<string, any> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.roles !== undefined) data.roles = input.roles;

      let emoji = await client.modifyGuildEmoji(input.guildId, input.emojiId, data);
      return {
        output: { emoji: formatEmoji(emoji) },
        message: `Updated emoji \`${input.emojiId}\` in guild \`${input.guildId}\`.`
      };
    }

    if (!input.emojiId) {
      throw discordServiceError('emojiId is required for delete action');
    }

    await client.deleteGuildEmoji(input.guildId, input.emojiId);
    return {
      output: { success: true, emojiId: input.emojiId },
      message: `Deleted emoji \`${input.emojiId}\` from guild \`${input.guildId}\`.`
    };
  })
  .build();
