import { createAxios, SlateAuth } from '@slates/provider';
import { z } from 'zod';
import {
  assertBusinessSuccess,
  assertConsumerSuccess,
  tiktokOAuthError,
  tiktokServiceError
} from './lib/errors';

let requireToken = (
  data: Record<string, any>,
  operation: string
): {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  openId?: string;
} => {
  if (typeof data.error === 'string') {
    throw tiktokServiceError(
      `TikTok OAuth ${operation} failed: ${data.error_description ?? data.error}`
    );
  }

  if (typeof data.access_token !== 'string' || data.access_token.length === 0) {
    throw tiktokServiceError(`TikTok OAuth ${operation} did not return an access token.`);
  }

  let expiresAt =
    typeof data.expires_in === 'number'
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined;

  return {
    accessToken: data.access_token,
    refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : undefined,
    expiresAt,
    openId: typeof data.open_id === 'string' ? data.open_id : undefined
  };
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      openId: z.string().optional(),
      businessAppId: z.string().optional(),
      businessSecret: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'TikTok OAuth (Consumer)',
    key: 'tiktok_oauth_consumer',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.tiktok.com/doc/login-kit-web'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.tiktok.com/doc/tiktok-api-scopes'
      }
    ],

    scopes: [
      {
        title: 'Basic User Info',
        description: 'Read basic profile info such as avatar, display name, and open ID.',
        scope: 'user.info.basic'
      },
      {
        title: 'User Profile',
        description:
          'Read extended profile info such as bio description, verification status, and username.',
        scope: 'user.info.profile'
      },
      {
        title: 'User Stats',
        description: 'Read follower count, following count, likes count, and video count.',
        scope: 'user.info.stats'
      },
      {
        title: 'Video List',
        description: 'Read the list of public videos posted by the user.',
        scope: 'video.list'
      },
      {
        title: 'Video Upload',
        description: 'Upload video content to TikTok on behalf of the user.',
        scope: 'video.upload'
      },
      {
        title: 'Video Publish',
        description: "Publish video content to the user's TikTok profile.",
        scope: 'video.publish'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_key: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(','),
        response_type: 'code',
        state: ctx.state
      });
      return {
        url: `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      try {
        let axios = createAxios();
        let response = await axios.post(
          'https://open.tiktokapis.com/v2/oauth/token/',
          new URLSearchParams({
            client_key: ctx.clientId,
            client_secret: ctx.clientSecret,
            code: ctx.code,
            grant_type: 'authorization_code',
            redirect_uri: ctx.redirectUri
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        let token = requireToken(response.data, 'authorization code exchange');

        return {
          output: {
            token: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt,
            openId: token.openId
          }
        };
      } catch (error) {
        throw tiktokOAuthError('authorization code exchange', error);
      }
    },

    handleTokenRefresh: async (ctx: any) => {
      try {
        if (!ctx.output.refreshToken) {
          throw tiktokServiceError('TikTok OAuth refresh requires a refresh token.');
        }

        let axios = createAxios();
        let response = await axios.post(
          'https://open.tiktokapis.com/v2/oauth/token/',
          new URLSearchParams({
            client_key: ctx.clientId,
            client_secret: ctx.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
        let token = requireToken(response.data, 'token refresh');

        return {
          output: {
            token: token.accessToken,
            refreshToken: token.refreshToken ?? ctx.output.refreshToken,
            expiresAt: token.expiresAt,
            openId: token.openId ?? ctx.output.openId
          }
        };
      } catch (error) {
        throw tiktokOAuthError('token refresh', error);
      }
    },

    getProfile: async (ctx: {
      output: { token: string; refreshToken?: string; expiresAt?: string; openId?: string };
      input: {};
      scopes: string[];
    }) => {
      try {
        let axios = createAxios();
        let fields = ['open_id', 'display_name', 'avatar_url'];

        if (ctx.scopes.includes('user.info.profile')) {
          fields.push('username', 'bio_description', 'is_verified');
        }

        let response = await axios.get(
          `https://open.tiktokapis.com/v2/user/info/?fields=${fields.join(',')}`,
          {
            headers: {
              Authorization: `Bearer ${ctx.output.token}`
            }
          }
        );
        assertConsumerSuccess(response.data, 'profile fetch');

        let user = response.data?.data?.user ?? {};

        return {
          profile: {
            id: user.open_id,
            name: user.display_name,
            imageUrl: user.avatar_url,
            username: user.username,
            bio: user.bio_description,
            verified: user.is_verified
          }
        };
      } catch (error) {
        throw tiktokOAuthError('profile fetch', error);
      }
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'TikTok OAuth (Business)',
    key: 'tiktok_oauth_business',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.tiktok.com/doc/login-kit-web'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.tiktok.com/doc/tiktok-api-scopes'
      }
    ],

    scopes: [],

    inputSchema: z.object({
      appId: z.string().describe('TikTok Business App ID'),
      secret: z.string().describe('TikTok Business App Secret')
    }),

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        app_id: ctx.input.appId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });
      return {
        url: `https://business-api.tiktok.com/portal/auth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      try {
        let axios = createAxios();
        let response = await axios.post(
          'https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/',
          {
            app_id: ctx.input.appId,
            secret: ctx.input.secret,
            auth_code: ctx.code
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        assertBusinessSuccess(response.data, 'authorization code exchange');

        let data = response.data?.data ?? response.data;
        let token = requireToken(data, 'business authorization code exchange');

        return {
          output: {
            token: token.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: token.expiresAt,
            openId: token.openId,
            businessAppId: ctx.input.appId,
            businessSecret: ctx.input.secret
          },
          input: ctx.input
        };
      } catch (error) {
        throw tiktokOAuthError('business authorization code exchange', error);
      }
    }
  });
