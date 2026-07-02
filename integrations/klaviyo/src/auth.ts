import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { klaviyoApiError } from './lib/errors';

const KLAVIYO_API_REVISION = '2026-04-15';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authType: z.enum(['oauth', 'private_api_key']).optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.klaviyo.com/en/docs/set_up_oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.klaviyo.com/en/docs/authenticate_#set-custom-scopes'
      }
    ],

    scopes: [
      {
        title: 'Accounts Read',
        description: 'Read account information (required by default)',
        scope: 'accounts:read'
      },
      {
        title: 'Campaigns Read',
        description: 'Read campaigns and campaign messages',
        scope: 'campaigns:read'
      },
      {
        title: 'Campaigns Write',
        description: 'Create, update, and delete campaigns',
        scope: 'campaigns:write'
      },
      {
        title: 'Catalogs Read',
        description: 'Read catalog items, variants, and categories',
        scope: 'catalogs:read'
      },
      {
        title: 'Catalogs Write',
        description: 'Create, update, and delete catalog data',
        scope: 'catalogs:write'
      },
      {
        title: 'Coupons Read',
        description: 'Read coupons and coupon codes',
        scope: 'coupons:read'
      },
      {
        title: 'Coupons Write',
        description: 'Create and manage coupons and coupon codes',
        scope: 'coupons:write'
      },
      {
        title: 'Data Privacy Write',
        description: 'Request profile deletions for privacy compliance',
        scope: 'data-privacy:write'
      },
      {
        title: 'Events Read',
        description: 'Read events and event data',
        scope: 'events:read'
      },
      {
        title: 'Events Write',
        description: 'Create custom events',
        scope: 'events:write'
      },
      {
        title: 'Flows Read',
        description: 'Read flows, flow actions, and flow messages',
        scope: 'flows:read'
      },
      {
        title: 'Flows Write',
        description: 'Create, update, and delete flows',
        scope: 'flows:write'
      },
      {
        title: 'Forms Read',
        description: 'Read forms and form versions',
        scope: 'forms:read'
      },
      {
        title: 'Images Read',
        description: 'Read uploaded images',
        scope: 'images:read'
      },
      {
        title: 'Images Write',
        description: 'Upload and manage images',
        scope: 'images:write'
      },
      {
        title: 'Lists Read',
        description: 'Read lists and list membership',
        scope: 'lists:read'
      },
      {
        title: 'Lists Write',
        description: 'Create, update, and delete lists and memberships',
        scope: 'lists:write'
      },
      {
        title: 'Metrics Read',
        description: 'Read metrics and metric aggregates',
        scope: 'metrics:read'
      },
      {
        title: 'Profiles Read',
        description: 'Read customer profiles',
        scope: 'profiles:read'
      },
      {
        title: 'Profiles Write',
        description: 'Create, update, and manage customer profiles',
        scope: 'profiles:write'
      },
      {
        title: 'Segments Read',
        description: 'Read segments and segment membership',
        scope: 'segments:read'
      },
      {
        title: 'Segments Write',
        description: 'Create, update, and delete segments',
        scope: 'segments:write'
      },
      {
        title: 'Subscriptions Read',
        description: 'Read subscription statuses',
        scope: 'subscriptions:read'
      },
      {
        title: 'Subscriptions Write',
        description: 'Subscribe and unsubscribe profiles',
        scope: 'subscriptions:write'
      },
      {
        title: 'Tags Read',
        description: 'Read tags and tag groups',
        scope: 'tags:read'
      },
      {
        title: 'Tags Write',
        description: 'Create, update, and delete tags',
        scope: 'tags:write'
      },
      {
        title: 'Templates Read',
        description: 'Read email templates',
        scope: 'templates:read'
      },
      {
        title: 'Templates Write',
        description: 'Create, update, and delete email templates',
        scope: 'templates:write'
      },
      {
        title: 'Webhooks Read',
        description: 'Read webhooks and webhook topics',
        scope: 'webhooks:read'
      },
      {
        title: 'Webhooks Write',
        description: 'Create, update, and delete webhooks',
        scope: 'webhooks:write'
      }
    ],

    inputSchema: z.object({
      codeVerifier: z.string().optional().describe('PKCE code verifier (auto-generated)')
    }),

    getAuthorizationUrl: async ctx => {
      // Generate PKCE code verifier and challenge
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await generateCodeChallenge(codeVerifier);

      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        scope: ctx.scopes.join(' '),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
      });

      return {
        url: `https://www.klaviyo.com/oauth/authorize?${params.toString()}`,
        input: {
          codeVerifier
        }
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let body = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.input.codeVerifier ?? '',
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let response = await axios
        .post('https://a.klaviyo.com/oauth/token', body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
        .catch(error => {
          throw klaviyoApiError(error, 'OAuth token exchange');
        });

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Klaviyo',
        operation: 'token exchange'
      });

      return {
        output: {
          token: token.token,
          authType: 'oauth' as const,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Klaviyo OAuth token refresh requires a stored refresh token. Reconnect the account.'
        );
      }

      let axios = createAxios();

      let body = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken,
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret
      });

      let response = await axios
        .post('https://a.klaviyo.com/oauth/token', body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
        .catch(error => {
          throw klaviyoApiError(error, 'OAuth token refresh');
        });

      let token = normalizeOAuthTokenResponse(response.data, {
        providerLabel: 'Klaviyo',
        operation: 'token refresh',
        previousRefreshToken: ctx.output.refreshToken
      });

      return {
        output: {
          token: token.token,
          authType: 'oauth' as const,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://a.klaviyo.com/api',
        headers: {
          Authorization: `Bearer ${ctx.output.token}`,
          revision: KLAVIYO_API_REVISION,
          Accept: 'application/vnd.api+json'
        }
      });

      let response = await axios.get('/accounts/').catch(error => {
        throw klaviyoApiError(error, 'account profile lookup');
      });
      let account = response.data?.data?.[0];

      return {
        profile: {
          id: account?.id,
          name: account?.attributes?.contact_information?.organization_name ?? undefined,
          email: account?.attributes?.contact_information?.default_sender_email ?? undefined
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Private API Key',
    key: 'private_api_key',

    inputSchema: z.object({
      token: z.string().describe('Klaviyo Private API Key (found in Settings > API Keys)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authType: 'private_api_key' as const
        }
      };
    },

    getProfile: async (ctx: any) => {
      let axios = createAxios({
        baseURL: 'https://a.klaviyo.com/api',
        headers: {
          Authorization: `Klaviyo-API-Key ${ctx.output.token}`,
          revision: KLAVIYO_API_REVISION,
          Accept: 'application/vnd.api+json'
        }
      });

      let response = await axios.get('/accounts/').catch(error => {
        throw klaviyoApiError(error, 'account profile lookup');
      });
      let account = response.data?.data?.[0];

      return {
        profile: {
          id: account?.id,
          name: account?.attributes?.contact_information?.organization_name ?? undefined,
          email: account?.attributes?.contact_information?.default_sender_email ?? undefined
        }
      };
    }
  });

// PKCE helpers

let generateCodeVerifier = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let length = 64;
  let result = '';
  let randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
};

let generateCodeChallenge = async (verifier: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(verifier);
  let digest = await crypto.subtle.digest('SHA-256', data);
  let bytes = new Uint8Array(digest);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
