import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import { twitterApiError, twitterServiceError } from './lib/errors';

let twitterApi = createAxios({
  baseURL: 'https://api.x.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code#scopes'
      }
    ],

    scopes: [
      { title: 'Read Posts', description: 'Read posts and timelines', scope: 'tweet.read' },
      { title: 'Write Posts', description: 'Create and delete posts', scope: 'tweet.write' },
      {
        title: 'Moderate Posts',
        description: 'Hide and unhide replies',
        scope: 'tweet.moderate.write'
      },
      {
        title: 'Read Users',
        description: 'Read user profile information',
        scope: 'users.read'
      },
      { title: 'Read Email', description: 'Read user email address', scope: 'users.email' },
      {
        title: 'Read Follows',
        description: 'Read follow relationships',
        scope: 'follows.read'
      },
      {
        title: 'Write Follows',
        description: 'Follow and unfollow users',
        scope: 'follows.write'
      },
      { title: 'Read Likes', description: 'Read liked posts', scope: 'like.read' },
      { title: 'Write Likes', description: 'Like and unlike posts', scope: 'like.write' },
      { title: 'Read DMs', description: 'Read direct messages', scope: 'dm.read' },
      { title: 'Write DMs', description: 'Send direct messages', scope: 'dm.write' },
      { title: 'Read Lists', description: 'Read lists', scope: 'list.read' },
      { title: 'Write Lists', description: 'Create and manage lists', scope: 'list.write' },
      {
        title: 'Upload Media',
        description: 'Upload images, videos, and GIFs',
        scope: 'media.write'
      },
      {
        title: 'Offline Access',
        description: 'Obtain a refresh token for long-lived access',
        scope: 'offline.access'
      },
      { title: 'Read Spaces', description: 'Read Spaces information', scope: 'space.read' },
      {
        title: 'Read Bookmarks',
        description: 'Read bookmarked posts',
        scope: 'bookmark.read'
      },
      { title: 'Write Bookmarks', description: 'Manage bookmarks', scope: 'bookmark.write' },
      { title: 'Read Blocks', description: 'Read blocked users', scope: 'block.read' },
      { title: 'Write Blocks', description: 'Block and unblock users', scope: 'block.write' },
      { title: 'Read Mutes', description: 'Read muted users', scope: 'mute.read' },
      { title: 'Write Mutes', description: 'Mute and unmute users', scope: 'mute.write' }
    ],

    getAuthorizationUrl: async (ctx: {
      redirectUri: string;
      state: string;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return {
        url: `https://x.com/i/oauth2/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async (ctx: {
      code: string;
      state: string;
      redirectUri: string;
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
      callbackState: Record<string, any>;
    }) => {
      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);
      let codeVerifier = ctx.callbackState?.codeVerifier || '';

      let response: any;
      try {
        response = await twitterApi.post(
          '/2/oauth2/token',
          new URLSearchParams({
            code: ctx.code,
            grant_type: 'authorization_code',
            redirect_uri: ctx.redirectUri,
            code_verifier: codeVerifier
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`
            }
          }
        );
      } catch (error) {
        throw twitterApiError(error, 'OAuth token exchange');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw twitterServiceError('X OAuth token response did not include an access token.');
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      clientId: string;
      clientSecret: string;
      scopes: string[];
    }) => {
      if (!ctx.output.refreshToken) {
        throw twitterServiceError(
          'No refresh token available. Include the offline.access scope to obtain a refresh token.'
        );
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let response: any;
      try {
        response = await twitterApi.post(
          '/2/oauth2/token',
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${credentials}`
            }
          }
        );
      } catch (error) {
        throw twitterApiError(error, 'OAuth token refresh');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw twitterServiceError('X OAuth refresh response did not include an access token.');
      }

      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: {};
      scopes: string[];
    }) => {
      let response: any;
      try {
        response = await twitterApi.get('/2/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          },
          params: {
            'user.fields': 'id,name,username,profile_image_url,description'
          }
        });
      } catch (error) {
        throw twitterApiError(error, 'OAuth profile lookup');
      }

      let user = response.data.data;
      if (!user?.id) {
        throw twitterServiceError('X profile response did not include a user.');
      }

      return {
        profile: {
          id: user.id,
          name: user.name,
          username: user.username,
          imageUrl: user.profile_image_url,
          description: user.description
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Bearer Token',
    key: 'bearer_token',

    inputSchema: z.object({
      token: z.string().describe('App-only Bearer Token from the Twitter Developer Portal')
    }),

    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string };
      input: { token: string };
    }) => {
      try {
        let response = await twitterApi.get('/2/users/me', {
          headers: {
            Authorization: `Bearer ${ctx.output.token}`
          },
          params: {
            'user.fields': 'id,name,username,profile_image_url'
          }
        });

        let user = response.data.data;
        return {
          profile: {
            id: user.id,
            name: user.name,
            username: user.username,
            imageUrl: user.profile_image_url
          }
        };
      } catch {
        return {
          profile: {
            name: 'App-Only Token'
          }
        };
      }
    }
  });

let generateCodeVerifier = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  let array = new Uint8Array(64);
  crypto.getRandomValues(array);
  for (let i = 0; i < 64; i++) {
    result += chars[(array[i] ?? 0) % chars.length];
  }
  return result;
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let digest = await crypto.subtle.digest('SHA-256', data);
  let base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
