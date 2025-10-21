import { metorial, z } from '@metorial/mcp-server-sdk';

/**
 * Discord MCP Server
 * Provides tools and resources for interacting with Discord API
 */

interface Config {
  token: {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
    webhook?: {
      id: string;
      token: string;
      type: number;
      channel_id: string;
      guild_id?: string;
      name: string;
      avatar?: string;
      application_id: string;
    };
    guild?: {
      id: string;
      name: string;
    };
  };
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const scopes = ['bot', 'messages.read', 'guilds', 'guilds.members.read', 'identify'].join(
      ' '
    );

    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: scopes,
      state: input.state,
      permissions: '1099780063296' // Comprehensive bot permissions
    });

    return {
      authorizationUrl: `https://discord.com/oauth2/authorize?${params.toString()}`
    };
  },
  handleCallback: async input => {
    try {
      const url = new URL(input.fullUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: input.redirectUri
      });

      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        webhook: tokenData.webhook,
        guild: tokenData.guild
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken
      });

      const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token || input.refreshToken,
        scope: tokenData.scope
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<Config>(
  {
    name: 'discord-mcp-server',
    version: '1.0.0'
  },
  async (server, cfg) => {
    // Base Discord API URL
    const DISCORD_API_BASE = 'https://discord.com/api/v10';

    /**
     * Helper function to make Discord API requests
     */
    async function discordRequest(
      endpoint: string,
      method: string = 'GET',
      body?: unknown
    ): Promise<any> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${cfg.token.access_token}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`${DISCORD_API_BASE}${endpoint}`, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord API Error (${response.status}): ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    }

    // Get the guild ID from the OAuth response
    const getGuildId = () => {
      if (cfg.token.guild?.id) {
        return cfg.token.guild.id;
      }
      throw new Error('No guild ID available. Please reconnect the integration.');
    };

    // ============================================================================
    // GUILD TOOLS
    // ============================================================================

    server.registerTool(
      'get_guild_info',
      {
        title: 'Get Guild Info',
        description: 'Get information about the connected Discord guild/server',
        inputSchema: {}
      },
      async () => {
        const guildId = getGuildId();
        const guild = await discordRequest(`/guilds/${guildId}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(guild, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_guild_channels',
      {
        title: 'List Guild Channels',
        description: 'List all channels in the guild',
        inputSchema: {}
      },
      async () => {
        const guildId = getGuildId();
        const channels = await discordRequest(`/guilds/${guildId}/channels`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(channels, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_channel',
      {
        title: 'Create Channel',
        description: 'Create a new channel in the guild',
        inputSchema: {
          name: z.string().describe('Channel name'),
          type: z
            .enum(['0', '2', '4', '5', '13', '15'])
            .optional()
            .describe(
              'Channel type (0=text, 2=voice, 4=category, 5=announcement, 13=stage, 15=forum)'
            ),
          topic: z.string().optional().describe('Channel topic (text channels only)'),
          parent_id: z.string().optional().describe('Category ID to place channel in')
        }
      },
      async ({ name, type, topic, parent_id }) => {
        const guildId = getGuildId();
        const body: any = { name };
        if (type) body.type = parseInt(type);
        if (topic) body.topic = topic;
        if (parent_id) body.parent_id = parent_id;

        const channel = await discordRequest(`/guilds/${guildId}/channels`, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Channel created successfully: ${JSON.stringify(channel, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_channel',
      {
        title: 'Update Channel',
        description: 'Update a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          name: z.string().optional().describe('New channel name'),
          topic: z.string().optional().describe('New channel topic'),
          position: z.number().optional().describe('New channel position')
        }
      },
      async ({ channelId, name, topic, position }) => {
        const body: any = {};
        if (name) body.name = name;
        if (topic) body.topic = topic;
        if (position !== undefined) body.position = position;

        const channel = await discordRequest(`/channels/${channelId}`, 'PATCH', body);

        return {
          content: [
            {
              type: 'text',
              text: `Channel updated successfully: ${JSON.stringify(channel, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_channel',
      {
        title: 'Delete Channel',
        description: 'Delete a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID to delete')
        }
      },
      async ({ channelId }) => {
        await discordRequest(`/channels/${channelId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Channel deleted successfully'
            }
          ]
        };
      }
    );

    // ============================================================================
    // MESSAGE TOOLS
    // ============================================================================

    server.registerTool(
      'list_channel_messages',
      {
        title: 'List Channel Messages',
        description: 'List messages from a Discord channel',
        inputSchema: {
          channelId: z.string().describe('The ID of the channel'),
          limit: z
            .number()
            .optional()
            .describe('Number of messages to retrieve (1-100, default 50)'),
          before: z.string().optional().describe('Get messages before this message ID'),
          after: z.string().optional().describe('Get messages after this message ID'),
          around: z.string().optional().describe('Get messages around this message ID')
        }
      },
      async ({ channelId, limit, before, after, around }) => {
        let endpoint = `/channels/${channelId}/messages?`;
        if (limit) endpoint += `limit=${limit}&`;
        if (before) endpoint += `before=${before}&`;
        if (after) endpoint += `after=${after}&`;
        if (around) endpoint += `around=${around}&`;

        const messages = await discordRequest(endpoint);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(messages, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'get_message',
      {
        title: 'Get Message',
        description: 'Get a specific message',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID')
        }
      },
      async ({ channelId, messageId }) => {
        const message = await discordRequest(`/channels/${channelId}/messages/${messageId}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(message, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'send_message',
      {
        title: 'Send Message',
        description: 'Send a message to a Discord channel',
        inputSchema: {
          channelId: z.string().describe('The ID of the channel'),
          content: z.string().describe('The message content'),
          tts: z.boolean().optional().describe('Send as text-to-speech message'),
          embeds: z.array(z.record(z.any())).optional().describe('Array of embed objects')
        }
      },
      async ({ channelId, content, tts, embeds }) => {
        const body: any = { content };
        if (tts) body.tts = tts;
        if (embeds) body.embeds = embeds;

        const message = await discordRequest(`/channels/${channelId}/messages`, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Message sent successfully: ${JSON.stringify(message, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'edit_message',
      {
        title: 'Edit Message',
        description: 'Edit an existing message in a Discord channel',
        inputSchema: {
          channelId: z.string().describe('The ID of the channel'),
          messageId: z.string().describe('The ID of the message to edit'),
          content: z.string().describe('The new message content')
        }
      },
      async ({ channelId, messageId, content }) => {
        const message = await discordRequest(
          `/channels/${channelId}/messages/${messageId}`,
          'PATCH',
          { content }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Message edited successfully: ${JSON.stringify(message, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_message',
      {
        title: 'Delete Message',
        description: 'Delete a message from a Discord channel',
        inputSchema: {
          channelId: z.string().describe('The ID of the channel'),
          messageId: z.string().describe('The ID of the message to delete')
        }
      },
      async ({ channelId, messageId }) => {
        await discordRequest(`/channels/${channelId}/messages/${messageId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Message deleted successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'bulk_delete_messages',
      {
        title: 'Bulk Delete Messages',
        description:
          'Delete multiple messages at once (2-100 messages, not older than 14 days)',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageIds: z.array(z.string()).describe('Array of message IDs to delete')
        }
      },
      async ({ channelId, messageIds }) => {
        await discordRequest(`/channels/${channelId}/messages/bulk-delete`, 'POST', {
          messages: messageIds
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted ${messageIds.length} messages`
            }
          ]
        };
      }
    );

    server.registerTool(
      'pin_message',
      {
        title: 'Pin Message',
        description: 'Pin a message in a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID to pin')
        }
      },
      async ({ channelId, messageId }) => {
        await discordRequest(`/channels/${channelId}/pins/${messageId}`, 'PUT');

        return {
          content: [
            {
              type: 'text',
              text: 'Message pinned successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'unpin_message',
      {
        title: 'Unpin Message',
        description: 'Unpin a message in a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID to unpin')
        }
      },
      async ({ channelId, messageId }) => {
        await discordRequest(`/channels/${channelId}/pins/${messageId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Message unpinned successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'get_pinned_messages',
      {
        title: 'Get Pinned Messages',
        description: 'Get all pinned messages in a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID')
        }
      },
      async ({ channelId }) => {
        const pins = await discordRequest(`/channels/${channelId}/pins`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(pins, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // REACTION TOOLS
    // ============================================================================

    server.registerTool(
      'add_reaction',
      {
        title: 'Add Reaction',
        description: 'Add a reaction to a message',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID'),
          emoji: z.string().describe('Emoji (Unicode emoji or custom emoji in format name:id)')
        }
      },
      async ({ channelId, messageId, emoji }) => {
        const encodedEmoji = encodeURIComponent(emoji);
        await discordRequest(
          `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`,
          'PUT'
        );

        return {
          content: [
            {
              type: 'text',
              text: 'Reaction added successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'remove_reaction',
      {
        title: 'Remove Reaction',
        description: 'Remove a reaction from a message',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID'),
          emoji: z.string().describe('Emoji'),
          userId: z.string().optional().describe('User ID (defaults to bot)')
        }
      },
      async ({ channelId, messageId, emoji, userId }) => {
        const encodedEmoji = encodeURIComponent(emoji);
        const user = userId || '@me';
        await discordRequest(
          `/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/${user}`,
          'DELETE'
        );

        return {
          content: [
            {
              type: 'text',
              text: 'Reaction removed successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'clear_reactions',
      {
        title: 'Clear Reactions',
        description: 'Remove all reactions from a message',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          messageId: z.string().describe('Message ID'),
          emoji: z
            .string()
            .optional()
            .describe('Specific emoji to clear (clears all if not specified)')
        }
      },
      async ({ channelId, messageId, emoji }) => {
        let endpoint = `/channels/${channelId}/messages/${messageId}/reactions`;
        if (emoji) {
          endpoint += `/${encodeURIComponent(emoji)}`;
        }
        await discordRequest(endpoint, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: emoji ? `Cleared ${emoji} reactions` : 'All reactions cleared'
            }
          ]
        };
      }
    );

    // ============================================================================
    // MEMBER TOOLS
    // ============================================================================

    server.registerTool(
      'list_guild_members',
      {
        title: 'List Guild Members',
        description: 'List members in the guild',
        inputSchema: {
          limit: z.number().optional().describe('Max number of members (1-1000, default 1)'),
          after: z.string().optional().describe('Get members after this user ID')
        }
      },
      async ({ limit = 1, after }) => {
        const guildId = getGuildId();
        let endpoint = `/guilds/${guildId}/members?limit=${limit}`;
        if (after) endpoint += `&after=${after}`;

        const members = await discordRequest(endpoint);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(members, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'get_guild_member',
      {
        title: 'Get Guild Member',
        description: 'Get a specific guild member',
        inputSchema: {
          userId: z.string().describe('User ID')
        }
      },
      async ({ userId }) => {
        const guildId = getGuildId();
        const member = await discordRequest(`/guilds/${guildId}/members/${userId}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(member, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'kick_member',
      {
        title: 'Kick Member',
        description: 'Kick a member from the guild',
        inputSchema: {
          userId: z.string().describe('User ID to kick'),
          reason: z.string().optional().describe('Reason for kick')
        }
      },
      async ({ userId, reason }) => {
        const guildId = getGuildId();
        const headers: any = {};
        if (reason) headers['X-Audit-Log-Reason'] = reason;

        await discordRequest(`/guilds/${guildId}/members/${userId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: `Member ${userId} kicked successfully`
            }
          ]
        };
      }
    );

    server.registerTool(
      'ban_member',
      {
        title: 'Ban Member',
        description: 'Ban a member from the guild',
        inputSchema: {
          userId: z.string().describe('User ID to ban'),
          deleteMessageDays: z
            .number()
            .optional()
            .describe('Number of days of messages to delete (0-7)'),
          reason: z.string().optional().describe('Reason for ban')
        }
      },
      async ({ userId, deleteMessageDays, reason }) => {
        const guildId = getGuildId();
        const body: any = {};
        if (deleteMessageDays !== undefined) body.delete_message_days = deleteMessageDays;

        await discordRequest(`/guilds/${guildId}/bans/${userId}`, 'PUT', body);

        return {
          content: [
            {
              type: 'text',
              text: `Member ${userId} banned successfully`
            }
          ]
        };
      }
    );

    server.registerTool(
      'unban_member',
      {
        title: 'Unban Member',
        description: 'Remove a ban for a user',
        inputSchema: {
          userId: z.string().describe('User ID to unban')
        }
      },
      async ({ userId }) => {
        const guildId = getGuildId();
        await discordRequest(`/guilds/${guildId}/bans/${userId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: `Member ${userId} unbanned successfully`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_bans',
      {
        title: 'List Bans',
        description: 'Get list of banned users',
        inputSchema: {
          limit: z.number().optional().describe('Max number of bans (1-1000)')
        }
      },
      async ({ limit = 1000 }) => {
        const guildId = getGuildId();
        const bans = await discordRequest(`/guilds/${guildId}/bans?limit=${limit}`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(bans, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // ROLE TOOLS
    // ============================================================================

    server.registerTool(
      'list_roles',
      {
        title: 'List Roles',
        description: 'List all roles in the guild',
        inputSchema: {}
      },
      async () => {
        const guildId = getGuildId();
        const roles = await discordRequest(`/guilds/${guildId}/roles`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(roles, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_role',
      {
        title: 'Create Role',
        description: 'Create a new role in the guild',
        inputSchema: {
          name: z.string().describe('Role name'),
          color: z.number().optional().describe('Role color (decimal color value)'),
          hoist: z.boolean().optional().describe('Display role separately'),
          mentionable: z.boolean().optional().describe('Allow anyone to mention this role')
        }
      },
      async ({ name, color, hoist, mentionable }) => {
        const guildId = getGuildId();
        const body: any = { name };
        if (color !== undefined) body.color = color;
        if (hoist !== undefined) body.hoist = hoist;
        if (mentionable !== undefined) body.mentionable = mentionable;

        const role = await discordRequest(`/guilds/${guildId}/roles`, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Role created successfully: ${JSON.stringify(role, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_role',
      {
        title: 'Delete Role',
        description: 'Delete a role from the guild',
        inputSchema: {
          roleId: z.string().describe('Role ID to delete')
        }
      },
      async ({ roleId }) => {
        const guildId = getGuildId();
        await discordRequest(`/guilds/${guildId}/roles/${roleId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Role deleted successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'add_member_role',
      {
        title: 'Add Member Role',
        description: 'Add a role to a guild member',
        inputSchema: {
          userId: z.string().describe('User ID'),
          roleId: z.string().describe('Role ID to add')
        }
      },
      async ({ userId, roleId }) => {
        const guildId = getGuildId();
        await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, 'PUT');

        return {
          content: [
            {
              type: 'text',
              text: 'Role added to member successfully'
            }
          ]
        };
      }
    );

    server.registerTool(
      'remove_member_role',
      {
        title: 'Remove Member Role',
        description: 'Remove a role from a guild member',
        inputSchema: {
          userId: z.string().describe('User ID'),
          roleId: z.string().describe('Role ID to remove')
        }
      },
      async ({ userId, roleId }) => {
        const guildId = getGuildId();
        await discordRequest(`/guilds/${guildId}/members/${userId}/roles/${roleId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Role removed from member successfully'
            }
          ]
        };
      }
    );

    // ============================================================================
    // INVITE TOOLS
    // ============================================================================

    server.registerTool(
      'create_invite',
      {
        title: 'Create Invite',
        description: 'Create an invite for a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          maxAge: z
            .number()
            .optional()
            .describe('Max age in seconds (0 for never, default 86400)'),
          maxUses: z.number().optional().describe('Max uses (0 for unlimited, default 0)'),
          temporary: z.boolean().optional().describe('Grant temporary membership')
        }
      },
      async ({ channelId, maxAge, maxUses, temporary }) => {
        const body: any = {};
        if (maxAge !== undefined) body.max_age = maxAge;
        if (maxUses !== undefined) body.max_uses = maxUses;
        if (temporary !== undefined) body.temporary = temporary;

        const invite = await discordRequest(`/channels/${channelId}/invites`, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Invite created: https://discord.gg/${invite.code}\n\n${JSON.stringify(
                invite,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_invites',
      {
        title: 'List Invites',
        description: 'Get all invites for the guild',
        inputSchema: {}
      },
      async () => {
        const guildId = getGuildId();
        const invites = await discordRequest(`/guilds/${guildId}/invites`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(invites, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_invite',
      {
        title: 'Delete Invite',
        description: 'Delete an invite',
        inputSchema: {
          inviteCode: z.string().describe('Invite code')
        }
      },
      async ({ inviteCode }) => {
        await discordRequest(`/invites/${inviteCode}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Invite deleted successfully'
            }
          ]
        };
      }
    );

    // ============================================================================
    // WEBHOOK TOOLS
    // ============================================================================

    server.registerTool(
      'list_webhooks',
      {
        title: 'List Webhooks',
        description: 'List all webhooks in a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID')
        }
      },
      async ({ channelId }) => {
        const webhooks = await discordRequest(`/channels/${channelId}/webhooks`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(webhooks, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_webhook',
      {
        title: 'Create Webhook',
        description: 'Create a webhook for a channel',
        inputSchema: {
          channelId: z.string().describe('Channel ID'),
          name: z.string().describe('Webhook name')
        }
      },
      async ({ channelId, name }) => {
        const webhook = await discordRequest(`/channels/${channelId}/webhooks`, 'POST', {
          name
        });

        return {
          content: [
            {
              type: 'text',
              text: `Webhook created successfully: ${JSON.stringify(webhook, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_webhook',
      {
        title: 'Delete Webhook',
        description: 'Delete a webhook',
        inputSchema: {
          webhookId: z.string().describe('Webhook ID')
        }
      },
      async ({ webhookId }) => {
        await discordRequest(`/webhooks/${webhookId}`, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: 'Webhook deleted successfully'
            }
          ]
        };
      }
    );
  }
);
