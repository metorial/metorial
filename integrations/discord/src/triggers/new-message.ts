import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let newMessage = SlateTrigger.create(spec, {
  name: 'New Message',
  key: 'new_message',
  description:
    'Triggers when a new message is posted in a Discord channel. Polls channel history for new messages.'
})
  .scopes(discordActionScopes.newMessage)
  .input(
    z.object({
      messageId: z.string().describe('Message ID'),
      channelId: z.string().describe('Channel ID where the message was posted'),
      guildId: z.string().optional().describe('Guild ID where the message was posted'),
      content: z.string().describe('Message text content'),
      authorId: z.string().optional().describe('User ID of the message author'),
      authorUsername: z.string().optional().describe('Username of the message author'),
      authorBot: z.boolean().optional().describe('Whether the author is a bot'),
      timestamp: z.string().describe('When the message was created'),
      editedTimestamp: z
        .string()
        .nullable()
        .optional()
        .describe('When the message was last edited'),
      pinned: z.boolean().optional().describe('Whether the message is pinned'),
      mentionEveryone: z
        .boolean()
        .optional()
        .describe('Whether the message mentions everyone'),
      attachmentCount: z.number().optional().describe('Number of attachments on the message'),
      embedCount: z.number().optional().describe('Number of embeds on the message')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Message ID'),
      channelId: z.string().describe('Channel ID'),
      guildId: z.string().optional().describe('Guild ID'),
      content: z.string().describe('Message text content'),
      authorId: z.string().optional().describe('User ID of the message author'),
      authorUsername: z.string().optional().describe('Username of the message author'),
      authorBot: z.boolean().optional().describe('Whether the author is a bot'),
      timestamp: z.string().describe('When the message was created'),
      editedTimestamp: z
        .string()
        .nullable()
        .optional()
        .describe('When the message was last edited'),
      pinned: z.boolean().optional().describe('Whether the message is pinned'),
      mentionEveryone: z
        .boolean()
        .optional()
        .describe('Whether the message mentions everyone'),
      attachmentCount: z.number().optional().describe('Number of attachments'),
      embedCount: z.number().optional().describe('Number of embeds')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new DiscordClient({
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let state = ctx.state as { lastMessageIds?: Record<string, string> } | null;
      let lastMessageIds = state?.lastMessageIds ?? {};

      // Fetch guilds the bot is a member of
      let guilds = await client.listCurrentUserGuilds(100);

      let allInputs: Array<{
        messageId: string;
        channelId: string;
        guildId?: string;
        content: string;
        authorId?: string;
        authorUsername?: string;
        authorBot?: boolean;
        timestamp: string;
        editedTimestamp?: string | null;
        pinned?: boolean;
        mentionEveryone?: boolean;
        attachmentCount?: number;
        embedCount?: number;
      }> = [];

      let updatedLastMessageIds = { ...lastMessageIds };

      for (let guild of guilds) {
        let channels: any[];
        try {
          channels = await client.getGuildChannels(guild.id);
        } catch {
          continue;
        }

        // Filter to text channels (type 0 = GUILD_TEXT)
        let textChannels = channels.filter((c: any) => c.type === 0);

        for (let channel of textChannels) {
          try {
            let lastId = lastMessageIds[channel.id];
            let options: { limit?: number; after?: string } = { limit: 50 };
            if (lastId) {
              options.after = lastId;
            }

            let messages = await client.getMessages(channel.id, options);

            if (messages.length === 0) continue;

            // Discord returns newest-first, sort oldest-first
            messages.sort((a: any, b: any) => {
              return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            });

            for (let msg of messages) {
              if (lastId && BigInt(msg.id) <= BigInt(lastId)) continue;

              allInputs.push({
                messageId: msg.id,
                channelId: channel.id,
                guildId: guild.id,
                content: msg.content || '',
                authorId: msg.author?.id,
                authorUsername: msg.author?.username,
                authorBot: msg.author?.bot || false,
                timestamp: msg.timestamp,
                editedTimestamp: msg.edited_timestamp || null,
                pinned: msg.pinned || false,
                mentionEveryone: msg.mention_everyone || false,
                attachmentCount: (msg.attachments || []).length,
                embedCount: (msg.embeds || []).length
              });
            }

            let newestId = messages[messages.length - 1].id;
            if (!lastId || BigInt(newestId) > BigInt(lastId)) {
              updatedLastMessageIds[channel.id] = newestId;
            }
          } catch {
            // Skip channels we can't read
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastMessageIds: updatedLastMessageIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'message.new',
        id: `${ctx.input.channelId}-${ctx.input.messageId}`,
        output: {
          messageId: ctx.input.messageId,
          channelId: ctx.input.channelId,
          guildId: ctx.input.guildId,
          content: ctx.input.content,
          authorId: ctx.input.authorId,
          authorUsername: ctx.input.authorUsername,
          authorBot: ctx.input.authorBot,
          timestamp: ctx.input.timestamp,
          editedTimestamp: ctx.input.editedTimestamp,
          pinned: ctx.input.pinned,
          mentionEveryone: ctx.input.mentionEveryone,
          attachmentCount: ctx.input.attachmentCount,
          embedCount: ctx.input.embedCount
        }
      };
    }
  })
  .build();
