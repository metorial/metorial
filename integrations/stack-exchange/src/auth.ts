import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { parseProviderData, stackExchangeError } from './lib/response';

let oauthAxios = createAxios({
  baseURL: 'https://stackoverflow.com'
});

oauthAxios.interceptors.response.use(
  response => response,
  error => Promise.reject(stackExchangeError(error))
);

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      key: z.string(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Read Inbox',
        description: 'Access to your global inbox across the Stack Exchange network.',
        scope: 'read_inbox'
      },
      {
        title: 'Write Access',
        description:
          'Ability to perform write operations such as posting comments and editing.',
        scope: 'write_access'
      },
      {
        title: 'No Expiry',
        description: 'Produces an access token that does not expire.',
        scope: 'no_expiry'
      }
    ],

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Stack Exchange API key (application key) from stackapps.com')
    }),

    getAuthorizationUrl: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError(
          'Provide the API key generated for your Stack Apps application.'
        );
      let scopeStr = ctx.scopes.join(',');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        ...(scopeStr ? { scope: scopeStr } : {})
      });

      return {
        url: `https://stackoverflow.com/oauth?${params.toString()}`,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError(
          'Provide the API key generated for your Stack Apps application.'
        );
      let response = await oauthAxios.post(
        '/oauth/access_token/json',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = parseProviderData(
        z.object({
          access_token: z.string().min(1),
          expires: z.number().nonnegative().optional()
        }),
        response.data,
        'OAuth token response'
      );
      let token = normalizeOAuthTokenResponse(
        { ...data, expires_in: data.expires },
        { providerLabel: 'Stack Exchange' }
      );

      return {
        output: {
          token: token.token,
          key: ctx.input.apiKey,
          expiresAt: token.expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async () => {
      throw createApiServiceError(
        'Stack Exchange does not provide refresh tokens. Reconnect with OAuth to obtain a new access token.'
      );
    },

    getProfile: async (ctx: {
      output: { token: string; key: string; expiresAt?: string };
    }) => {
      let result = await new Client({
        token: ctx.output.token,
        key: ctx.output.key,
        site: 'stackoverflow'
      }).getMe();
      let user = result.items[0];
      if (!user)
        throw createApiServiceError(
          'No Stack Overflow profile was returned for this connection.'
        );
      return {
        profile: {
          id: String(user.user_id),
          name: user.display_name,
          ...(typeof user.profile_image === 'string' ? { imageUrl: user.profile_image } : {})
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Your Stack Exchange API key (application key) from stackapps.com')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim())
        throw createApiServiceError(
          'Provide the API key generated for your Stack Apps application.'
        );
      return {
        output: {
          token: '',
          key: ctx.input.apiKey
        }
      };
    }
  });
