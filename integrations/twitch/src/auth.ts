import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      clientId: z.string()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Twitch OAuth',
    key: 'oauth',

    scopes: [
      // Analytics
      {
        title: 'Extension Analytics',
        description: 'View analytics data for your extensions',
        scope: 'analytics:read:extensions'
      },
      {
        title: 'Game Analytics',
        description: 'View analytics data for your games',
        scope: 'analytics:read:games'
      },

      // Bits
      {
        title: 'Read Bits',
        description: 'View Bits information for a channel',
        scope: 'bits:read'
      },

      // Channel Management
      {
        title: 'Manage Broadcast',
        description: "Manage a channel's broadcast configuration (title, game, etc.)",
        scope: 'channel:manage:broadcast'
      },
      {
        title: 'Manage Schedule',
        description: "Manage a channel's stream schedule",
        scope: 'channel:manage:schedule'
      },
      {
        title: 'Manage Videos',
        description: "Manage a channel's videos (delete)",
        scope: 'channel:manage:videos'
      },
      {
        title: 'Manage Raids',
        description: "Manage a channel's raids",
        scope: 'channel:manage:raids'
      },
      {
        title: 'Manage Ads',
        description: 'Manage ads schedule on a channel',
        scope: 'channel:manage:ads'
      },
      {
        title: 'Run Commercial',
        description: 'Run commercials on a channel',
        scope: 'channel:edit:commercial'
      },

      // Channel Reading
      {
        title: 'Read Subscriptions',
        description: "View a channel's subscribers",
        scope: 'channel:read:subscriptions'
      },
      {
        title: 'Read Editors',
        description: "View a channel's editors",
        scope: 'channel:read:editors'
      },
      {
        title: 'Read Goals',
        description: "View a channel's goals",
        scope: 'channel:read:goals'
      },
      {
        title: 'Read Hype Train',
        description: 'View Hype Train events',
        scope: 'channel:read:hype_train'
      },
      {
        title: 'Read Polls',
        description: "View a channel's polls",
        scope: 'channel:read:polls'
      },
      {
        title: 'Read Predictions',
        description: "View a channel's predictions",
        scope: 'channel:read:predictions'
      },
      {
        title: 'Read Charity',
        description: 'View charity campaign details',
        scope: 'channel:read:charity'
      },
      {
        title: 'Read Ads',
        description: 'Read the ads schedule and details',
        scope: 'channel:read:ads'
      },
      { title: 'Read VIPs', description: "View a channel's VIPs", scope: 'channel:read:vips' },

      // Channel Points
      {
        title: 'Read Redemptions',
        description: 'View Channel Points rewards and redemptions',
        scope: 'channel:read:redemptions'
      },
      {
        title: 'Manage Redemptions',
        description: 'Manage Channel Points rewards and redemptions',
        scope: 'channel:manage:redemptions'
      },

      // Chat
      { title: 'Read Chat', description: 'Read chat messages', scope: 'user:read:chat' },
      { title: 'Write Chat', description: 'Send chat messages', scope: 'user:write:chat' },
      {
        title: 'Channel Bot',
        description: "Appear in channel's chat as a bot",
        scope: 'channel:bot'
      },
      { title: 'User Bot', description: 'Appear in chat as a bot user', scope: 'user:bot' },

      // Clips
      { title: 'Create Clips', description: 'Create clips on a channel', scope: 'clips:edit' },
      {
        title: 'Manage Clips',
        description: 'Manage clips on a channel',
        scope: 'channel:manage:clips'
      },

      // Moderation
      {
        title: 'Channel Moderate',
        description: 'Perform moderation actions in a channel',
        scope: 'channel:moderate'
      },
      {
        title: 'Read Moderation',
        description: 'View moderation data',
        scope: 'moderation:read'
      },
      {
        title: 'Manage Bans',
        description: 'Ban and unban users',
        scope: 'moderator:manage:banned_users'
      },
      {
        title: 'Manage AutoMod',
        description: 'Manage AutoMod settings',
        scope: 'moderator:manage:automod'
      },
      {
        title: 'Manage Chat Messages',
        description: 'Delete chat messages',
        scope: 'moderator:manage:chat_messages'
      },
      {
        title: 'Manage Blocked Terms',
        description: 'Manage blocked terms',
        scope: 'moderator:manage:blocked_terms'
      },
      {
        title: 'Manage Chat Settings',
        description: 'Manage chat settings',
        scope: 'moderator:manage:chat_settings'
      },
      {
        title: 'Read Chatters',
        description: 'View the chatters list',
        scope: 'moderator:read:chatters'
      },
      {
        title: 'Read Followers',
        description: 'View follower list',
        scope: 'moderator:read:followers'
      },
      {
        title: 'Manage Shield Mode',
        description: 'Manage Shield Mode',
        scope: 'moderator:manage:shield_mode'
      },
      {
        title: 'Manage Shoutouts',
        description: 'Manage shoutouts',
        scope: 'moderator:manage:shoutouts'
      },
      {
        title: 'Manage Warnings',
        description: 'Manage user warnings',
        scope: 'moderator:manage:warnings'
      },
      {
        title: 'Read Suspicious Users',
        description: 'View suspicious users',
        scope: 'moderator:read:suspicious_users'
      },

      // Polls & Predictions
      {
        title: 'Manage Polls',
        description: 'Create and manage polls',
        scope: 'channel:manage:polls'
      },
      {
        title: 'Manage Predictions',
        description: 'Create and manage predictions',
        scope: 'channel:manage:predictions'
      },

      // User
      { title: 'Edit User', description: 'Manage a user account', scope: 'user:edit' },
      {
        title: 'Read Email',
        description: 'View user email address',
        scope: 'user:read:email'
      },
      { title: 'Read Follows', description: 'View user follows', scope: 'user:read:follows' },
      {
        title: 'Read User Subscriptions',
        description: 'View user subscriptions',
        scope: 'user:read:subscriptions'
      },
      {
        title: 'Read Blocked Users',
        description: 'View blocked users list',
        scope: 'user:read:blocked_users'
      },
      {
        title: 'Manage Blocked Users',
        description: 'Block and unblock users',
        scope: 'user:manage:blocked_users'
      },
      { title: 'Read Emotes', description: 'View user emotes', scope: 'user:read:emotes' },
      {
        title: 'Manage Whispers',
        description: 'Send whisper messages',
        scope: 'user:manage:whispers'
      },

      // OpenID Connect
      {
        title: 'OpenID Connect',
        description: 'Use OIDC to verify user identity',
        scope: 'openid'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        force_verify: 'true'
      });

      return {
        url: `https://id.twitch.tv/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let client = createAxios({ baseURL: 'https://id.twitch.tv/oauth2' });

      let response = await client.post('/token', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          grant_type: 'authorization_code',
          redirect_uri: ctx.redirectUri
        }
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string[];
      };

      if (!data.access_token) {
        throw new Error('Failed to obtain access token from Twitch');
      }

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          clientId: ctx.clientId
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let client = createAxios({ baseURL: 'https://id.twitch.tv/oauth2' });

      let response = await client.post('/token', null, {
        params: {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken
        }
      });

      let data = response.data as {
        access_token: string;
        refresh_token?: string;
        expires_in: number;
        token_type: string;
        scope?: string[];
      };

      if (!data.access_token) {
        throw new Error('Failed to refresh Twitch access token');
      }

      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          clientId: ctx.output.clientId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; clientId: string };
      input: {};
      scopes: string[];
    }) => {
      let client = createAxios({ baseURL: 'https://api.twitch.tv/helix' });

      let response = await client.get('/users', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Client-Id': ctx.output.clientId
        }
      });

      let data = response.data as {
        data: Array<{
          id: string;
          login: string;
          display_name: string;
          email?: string;
          profile_image_url?: string;
          description?: string;
          broadcaster_type?: string;
          type?: string;
          created_at?: string;
        }>;
      };

      let user = data.data?.[0];
      if (!user) {
        throw new Error('Failed to fetch Twitch user profile');
      }

      return {
        profile: {
          id: user.id,
          name: user.display_name,
          email: user.email,
          imageUrl: user.profile_image_url,
          login: user.login,
          broadcasterType: user.broadcaster_type,
          description: user.description
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      token: z.string().describe('Twitch OAuth access token'),
      clientId: z.string().describe('Twitch application Client ID')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          clientId: ctx.input.clientId
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; clientId: string };
      input: { token: string; clientId: string };
    }) => {
      let client = createAxios({ baseURL: 'https://api.twitch.tv/helix' });

      let response = await client.get('/users', {
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          'Client-Id': ctx.output.clientId
        }
      });

      let data = response.data as {
        data: Array<{
          id: string;
          login: string;
          display_name: string;
          email?: string;
          profile_image_url?: string;
        }>;
      };

      let user = data.data?.[0];
      if (!user) {
        throw new Error('Failed to fetch Twitch user profile');
      }

      return {
        profile: {
          id: user.id,
          name: user.display_name,
          email: user.email,
          imageUrl: user.profile_image_url,
          login: user.login
        }
      };
    }
  });
