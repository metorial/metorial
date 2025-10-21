import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Slack MCP Server
 * Provides tools and resources for interacting with Slack workspaces
 */

interface Config {
  token: string;
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const scopes = [
      'channels:read',
      'channels:history',
      'chat:write',
      'files:write',
      'team:read',
      'groups:read',
      'groups:history',
      'im:read',
      'im:history',
      'mpim:read',
      'mpim:history',
      'reactions:write',
      'users:read'
    ].join(',');

    const params = new URLSearchParams({
      client_id: input.clientId,
      scope: scopes,
      redirect_uri: input.redirectUri,
      state: input.state
    });

    return {
      authorizationUrl: `https://slack.com/oauth/v2/authorize?${params.toString()}`
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
        code: code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri
      });

      const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
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

      if (!tokenData.ok) {
        throw new Error(`Slack OAuth error: ${tokenData.error || 'Unknown error'}`);
      }

      return {
        access_token: tokenData.access_token,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        bot_user_id: tokenData.bot_user_id,
        app_id: tokenData.app_id,
        team: tokenData.team,
        enterprise: tokenData.enterprise
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<Config>(
  {
    name: 'slack-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Base URL for Slack API
    const SLACK_API_BASE = 'https://slack.com/api';

    /**
     * Helper function to make Slack API requests
     */
    async function slackRequest(
      endpoint: string,
      method: string = 'GET',
      body?: Record<string, any>
    ): Promise<any> {
      console.log(config);

      const url = `${SLACK_API_BASE}/${endpoint}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      // For GET requests with body, append as query params
      let finalUrl = url;
      if (body && method === 'GET') {
        const params = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        finalUrl = `${url}?${params.toString()}`;
      }

      const response = await fetch(finalUrl, options);
      const data = (await response.json()) as any;

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
      }

      return data;
    }

    // ==================== TOOLS ====================

    /**
     * Tool: send_message
     * Send a message to a Slack channel or user
     */
    server.registerTool(
      'send_message',
      {
        title: 'Send Message',
        description: 'Send a message to a Slack channel or user',
        inputSchema: {
          channel_id: z.string().describe('Channel ID or user ID to send message to'),
          text: z.string().describe('Message text content'),
          thread_ts: z.string().optional().describe('Thread timestamp to reply in a thread')
          // blocks: z.array(z.any()).optional().describe('Slack Block Kit blocks for rich formatting')
        }
      },
      async ({ channel_id, text, thread_ts }) => {
        const body: Record<string, any> = {
          channel: channel_id,
          text
        };

        if (thread_ts) {
          body.thread_ts = thread_ts;
        }

        /*if (blocks) {
        body.blocks = blocks;
      }*/

        const result = await slackRequest('chat.postMessage', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message_ts: result.ts,
                  channel: result.channel
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: list_channels
     * List all channels accessible to the bot
     */
    server.registerTool(
      'list_channels',
      {
        title: 'List Channels',
        description: 'List all channels accessible to the bot',
        inputSchema: {
          types: z
            .string()
            .optional()
            .describe('Channel types to include (e.g., "public_channel,private_channel")'),
          exclude_archived: z.boolean().optional().describe('Exclude archived channels'),
          limit: z.number().optional().describe('Maximum number of channels to return')
        }
      },
      async ({ types, exclude_archived, limit }) => {
        const params: Record<string, any> = {};

        if (types) params.types = types;
        if (exclude_archived !== undefined) params.exclude_archived = exclude_archived;
        if (limit) params.limit = limit;

        const result = await slackRequest('conversations.list', 'GET', params);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  channels: result.channels.map((ch: any) => ({
                    id: ch.id,
                    name: ch.name,
                    is_private: ch.is_private,
                    is_archived: ch.is_archived,
                    num_members: ch.num_members
                  }))
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: list_users
     * List users in the workspace
     */
    /*server.registerTool(
    'list_users',
    {
      title: 'List Users',
      description: 'List users in the Slack workspace',
      inputSchema: {
        limit: z.number().optional().describe('Maximum number of users to return'),
        cursor: z.string().optional().describe('Pagination cursor')
      }
    },
    async ({ limit, cursor }) => {
      const params: Record<string, any> = {};
      
      if (limit) params.limit = limit;
      if (cursor) params.cursor = cursor;

      const result = await slackRequest('users.list', 'GET', params);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              users: result.members.map((user: any) => ({
                id: user.id,
                name: user.name,
                real_name: user.real_name,
                is_bot: user.is_bot,
                deleted: user.deleted
              })),
              next_cursor: result.response_metadata?.next_cursor
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: create_channel
     * Create a new Slack channel
     */
    /*server.registerTool(
    'create_channel',
    {
      title: 'Create Channel',
      description: 'Create a new Slack channel',
      inputSchema: {
        name: z.string().describe('Channel name (lowercase, no spaces)'),
        is_private: z.boolean().optional().describe('Create as private channel'),
        description: z.string().optional().describe('Channel description')
      }
    },
    async ({ name, is_private, description }) => {
      const body: Record<string, any> = { name };
      
      if (is_private !== undefined) body.is_private = is_private;

      const result = await slackRequest('conversations.create', 'POST', body);

      // Set description if provided
      if (description && result.channel?.id) {
        await slackRequest('conversations.setPurpose', 'POST', {
          channel: result.channel.id,
          purpose: description
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              channel: {
                id: result.channel.id,
                name: result.channel.name,
                is_private: result.channel.is_private
              }
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: invite_to_channel
     * Invite users to a channel
     */
    /*server.registerTool(
    'invite_to_channel',
    {
      title: 'Invite to Channel',
      description: 'Invite one or more users to a channel',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        user_ids: z.array(z.string()).describe('Array of user IDs to invite')
      }
    },
    async ({ channel_id, user_ids }) => {
      const result = await slackRequest('conversations.invite', 'POST', {
        channel: channel_id,
        users: user_ids.join(',')
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              channel: result.channel?.id
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: archive_channel
     * Archive a channel
     */
    /*server.registerTool(
    'archive_channel',
    {
      title: 'Archive Channel',
      description: 'Archive a Slack channel',
      inputSchema: {
        channel_id: z.string().describe('Channel ID to archive')
      }
    },
    async ({ channel_id }) => {
      await slackRequest('conversations.archive', 'POST', {
        channel: channel_id
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Channel ${channel_id} archived successfully`
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: set_channel_topic
     * Set the topic of a channel
     */
    /*server.registerTool(
    'set_channel_topic',
    {
      title: 'Set Channel Topic',
      description: 'Set the topic of a Slack channel',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        topic: z.string().describe('New channel topic')
      }
    },
    async ({ channel_id, topic }) => {
      const result = await slackRequest('conversations.setTopic', 'POST', {
        channel: channel_id,
        topic
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              topic: result.topic
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: set_channel_purpose
     * Set the purpose of a channel
     */
    /*server.registerTool(
    'set_channel_purpose',
    {
      title: 'Set Channel Purpose',
      description: 'Set the purpose/description of a Slack channel',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        purpose: z.string().describe('New channel purpose')
      }
    },
    async ({ channel_id, purpose }) => {
      const result = await slackRequest('conversations.setPurpose', 'POST', {
        channel: channel_id,
        purpose
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              purpose: result.purpose
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: add_reaction
     * Add an emoji reaction to a message
     */
    server.registerTool(
      'add_reaction',
      {
        title: 'Add Reaction',
        description: 'Add an emoji reaction to a message',
        inputSchema: {
          channel_id: z.string().describe('Channel ID'),
          timestamp: z.string().describe('Message timestamp'),
          reaction: z.string().describe('Emoji name without colons (e.g., "thumbsup")')
        }
      },
      async ({ channel_id, timestamp, reaction }) => {
        await slackRequest('reactions.add', 'POST', {
          channel: channel_id,
          timestamp,
          name: reaction
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `Added :${reaction}: reaction`
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: remove_reaction
     * Remove an emoji reaction from a message
     */
    /*server.registerTool(
    'remove_reaction',
    {
      title: 'Remove Reaction',
      description: 'Remove an emoji reaction from a message',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        timestamp: z.string().describe('Message timestamp'),
        reaction: z.string().describe('Emoji name without colons (e.g., "thumbsup")')
      }
    },
    async ({ channel_id, timestamp, reaction }) => {
      await slackRequest('reactions.remove', 'POST', {
        channel: channel_id,
        timestamp,
        name: reaction
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: `Removed :${reaction}: reaction`
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: upload_file
     * Upload a file to Slack
     */
    server.registerTool(
      'upload_file',
      {
        title: 'Upload File',
        description: 'Upload a file to Slack channels',
        inputSchema: {
          channels: z.array(z.string()).describe('Array of channel IDs to share file in'),
          content: z.string().describe('File content as string'),
          filename: z.string().describe('Filename'),
          title: z.string().optional().describe('File title'),
          initial_comment: z.string().optional().describe('Initial comment with file')
        }
      },
      async ({ channels, content, filename, title, initial_comment }) => {
        const body: Record<string, any> = {
          channels: channels.join(','),
          content,
          filename
        };

        if (title) body.title = title;
        if (initial_comment) body.initial_comment = initial_comment;

        const result = await slackRequest('files.upload', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  file: {
                    id: result.file.id,
                    name: result.file.name,
                    url_private: result.file.url_private
                  }
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: delete_message
     * Delete a message from Slack
     */
    /*server.registerTool(
    'delete_message',
    {
      title: 'Delete Message',
      description: 'Delete a message from a Slack channel',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        timestamp: z.string().describe('Message timestamp')
      }
    },
    async ({ channel_id, timestamp }) => {
      await slackRequest('chat.delete', 'POST', {
        channel: channel_id,
        ts: timestamp
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Message deleted successfully'
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: update_message
     * Update an existing message
     */
    /*server.registerTool(
    'update_message',
    {
      title: 'Update Message',
      description: 'Update the content of an existing message',
      inputSchema: {
        channel_id: z.string().describe('Channel ID'),
        timestamp: z.string().describe('Message timestamp'),
        text: z.string().describe('New message text'),
        blocks: z.array(z.any()).optional().describe('Slack Block Kit blocks for rich formatting')
      }
    },
    async ({ channel_id, timestamp, text, blocks }) => {
      const body: Record<string, any> = {
        channel: channel_id,
        ts: timestamp,
        text
      };

      if (blocks) {
        body.blocks = blocks;
      }

      const result = await slackRequest('chat.update', 'POST', body);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message_ts: result.ts,
              channel: result.channel
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Tool: search_messages
     * Search for messages in the workspace
     */
    server.registerTool(
      'list_messages',
      {
        title: 'List Messages',
        description: 'List messages from a specific channel',
        inputSchema: {
          channel_id: z.string().describe('The channel to list messages for')
        }
      },
      async ({ channel_id }) => {
        const result = await slackRequest('conversations.history', 'GET', {
          channel: channel_id,
          limit: 100
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  channel_id,
                  messages: result.messages.map((msg: any) => ({
                    type: msg.type,
                    user: msg.user,
                    text: msg.text,
                    timestamp: msg.ts,
                    thread_ts: msg.thread_ts,
                    reply_count: msg.reply_count,
                    reactions: msg.reactions
                  }))
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: list_conversations
     * List conversations (channels, DMs, groups)
     */
    server.registerTool(
      'list_conversations',
      {
        title: 'List Conversations',
        description: 'List all conversations including channels, DMs, and groups',
        inputSchema: {
          types: z
            .string()
            .optional()
            .describe('Conversation types (e.g., "public_channel,private_channel,mpim,im")'),
          limit: z.number().optional().describe('Maximum number of conversations to return')
        }
      },
      async ({ types, limit }) => {
        const params: Record<string, any> = {};

        if (types) params.types = types;
        if (limit) params.limit = limit;

        const result = await slackRequest('conversations.list', 'GET', params);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  conversations: result.channels.map((conv: any) => ({
                    id: conv.id,
                    name: conv.name,
                    is_channel: conv.is_channel,
                    is_group: conv.is_group,
                    is_im: conv.is_im,
                    is_private: conv.is_private
                  }))
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    // ==================== RESOURCES ====================

    /**
     * Resource: slack://channel/{channel_id}
     * Get detailed information about a specific channel
     */
    server.registerResource(
      'channel_info',
      new ResourceTemplate('slack://channel/{channel_id}', { list: undefined }),
      {
        title: 'Channel Information',
        description: 'Get detailed information about a specific Slack channel'
      },
      async (uri, { channel_id }) => {
        const result = await slackRequest('conversations.info', 'GET', {
          channel: channel_id
        });

        const channel = result.channel;

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  id: channel.id,
                  name: channel.name,
                  is_channel: channel.is_channel,
                  is_private: channel.is_private,
                  is_archived: channel.is_archived,
                  created: channel.created,
                  creator: channel.creator,
                  topic: channel.topic,
                  purpose: channel.purpose,
                  num_members: channel.num_members
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://channel/{channel_id}/messages
     * Get recent messages from a specific channel
     */
    server.registerResource(
      'channel_messages',
      new ResourceTemplate('slack://channel/{channel_id}/messages', { list: undefined }),
      {
        title: 'Channel Messages',
        description: 'Get recent messages from a specific channel'
      },
      async (uri, { channel_id }) => {
        const result = await slackRequest('conversations.history', 'GET', {
          channel: channel_id,
          limit: 100
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  channel_id,
                  messages: result.messages.map((msg: any) => ({
                    type: msg.type,
                    user: msg.user,
                    text: msg.text,
                    timestamp: msg.ts,
                    thread_ts: msg.thread_ts,
                    reply_count: msg.reply_count,
                    reactions: msg.reactions
                  }))
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://channel/{channel_id}/members
     * Get list of members in a specific channel
     */
    server.registerResource(
      'channel_members',
      new ResourceTemplate('slack://channel/{channel_id}/members', { list: undefined }),
      {
        title: 'Channel Members',
        description: 'Get list of all members in a specific channel'
      },
      async (uri, { channel_id }) => {
        const result = await slackRequest('conversations.members', 'GET', {
          channel: channel_id,
          limit: 1000
        });

        // Get user info for each member
        const memberDetails = await Promise.all(
          result.members.slice(0, 50).map(async (userId: string) => {
            try {
              const userInfo = await slackRequest('users.info', 'GET', { user: userId });
              return {
                id: userId,
                name: userInfo.user.name,
                real_name: userInfo.user.real_name,
                is_bot: userInfo.user.is_bot
              };
            } catch {
              return { id: userId, name: 'Unknown', real_name: 'Unknown', is_bot: false };
            }
          })
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  channel_id,
                  total_members: result.members.length,
                  members: memberDetails
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://user/{user_id}
     * Get detailed information about a specific user
     */
    /*server.registerResource(
    'user_info',
    new ResourceTemplate('slack://user/{user_id}', { list: undefined }),
    {
      title: 'User Information',
      description: 'Get detailed information about a specific Slack user'
    },
    async (uri, { user_id }) => {
      const result = await slackRequest('users.info', 'GET', {
        user: user_id
      });

      const user = result.user;

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({
              id: user.id,
              name: user.name,
              real_name: user.real_name,
              display_name: user.profile?.display_name,
              email: user.profile?.email,
              title: user.profile?.title,
              phone: user.profile?.phone,
              status_text: user.profile?.status_text,
              status_emoji: user.profile?.status_emoji,
              is_admin: user.is_admin,
              is_owner: user.is_owner,
              is_bot: user.is_bot,
              deleted: user.deleted,
              timezone: user.tz,
              timezone_label: user.tz_label
            }, null, 2)
          }
        ]
      };
    }
  );*/

    /**
     * Resource: slack://message/{channel_id}/{timestamp}
     * Get a specific message and its thread
     */
    server.registerResource(
      'message_info',
      new ResourceTemplate('slack://message/{channel_id}/{timestamp}', { list: undefined }),
      {
        title: 'Message Information',
        description: 'Get details about a specific message including reactions and metadata'
      },
      async (uri, { channel_id, timestamp }) => {
        const result = await slackRequest('conversations.history', 'GET', {
          channel: channel_id,
          latest: timestamp,
          inclusive: true,
          limit: 1
        });

        if (!result.messages || result.messages.length === 0) {
          throw new Error('Message not found');
        }

        const message = result.messages[0];

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  channel_id,
                  timestamp: message.ts,
                  user: message.user,
                  text: message.text,
                  type: message.type,
                  thread_ts: message.thread_ts,
                  reply_count: message.reply_count,
                  reply_users_count: message.reply_users_count,
                  reactions: message.reactions,
                  attachments: message.attachments,
                  blocks: message.blocks
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://thread/{channel_id}/{thread_ts}
     * Get all replies in a message thread
     */
    server.registerResource(
      'thread_replies',
      new ResourceTemplate('slack://thread/{channel_id}/{thread_ts}', { list: undefined }),
      {
        title: 'Thread Replies',
        description: 'Get all replies in a message thread'
      },
      async (uri, { channel_id, thread_ts }) => {
        const result = await slackRequest('conversations.replies', 'GET', {
          channel: channel_id,
          ts: thread_ts
        });

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  channel_id,
                  thread_ts,
                  reply_count: result.messages.length - 1,
                  messages: result.messages.map((msg: any) => ({
                    user: msg.user,
                    text: msg.text,
                    timestamp: msg.ts,
                    reactions: msg.reactions
                  }))
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://workspace/info
     * Get workspace information
     */
    server.registerResource(
      'workspace_info',
      new ResourceTemplate('slack://workspace/info', { list: undefined }),
      {
        title: 'Workspace Information',
        description: 'Get information about the current Slack workspace'
      },
      async uri => {
        const result = await slackRequest('team.info', 'GET', {});

        const team = result.team;

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  id: team.id,
                  name: team.name,
                  domain: team.domain,
                  email_domain: team.email_domain,
                  icon: team.icon
                },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Resource: slack://file/{file_id}
     * Get information about a specific file
     */
    server.registerResource(
      'file_info',
      new ResourceTemplate('slack://file/{file_id}', { list: undefined }),
      {
        title: 'File Information',
        description: 'Get information about a specific uploaded file'
      },
      async (uri, { file_id }) => {
        const result = await slackRequest('files.info', 'GET', {
          file: file_id
        });

        const file = result.file;

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  id: file.id,
                  name: file.name,
                  title: file.title,
                  mimetype: file.mimetype,
                  filetype: file.filetype,
                  size: file.size,
                  url_private: file.url_private,
                  url_private_download: file.url_private_download,
                  permalink: file.permalink,
                  created: file.created,
                  user: file.user,
                  channels: file.channels,
                  comments_count: file.comments_count
                },
                null,
                2
              )
            }
          ]
        };
      }
    );
  }
);
