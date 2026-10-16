import {
  createApiServiceError,
  createAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { matterportError } from './lib/errors';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['basic', 'bearer']),
      tokenId: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Token (Basic Auth)',
    key: 'api_token',

    inputSchema: z.object({
      tokenId: z.string().describe('Token ID from Matterport Developer Tools'),
      tokenSecret: z.string().describe('Token Secret from Matterport Developer Tools')
    }),

    getOutput: async ctx => {
      if (!ctx.input.tokenId || !ctx.input.tokenSecret)
        throw createApiServiceError('Provide both the Matterport Token ID and Token Secret.');
      let basicToken = Buffer.from(`${ctx.input.tokenId}:${ctx.input.tokenSecret}`).toString(
        'base64'
      );
      return {
        output: {
          token: basicToken,
          authType: 'basic' as const,
          tokenId: ctx.input.tokenId
        }
      };
    }
  })
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth',

    scopes: [
      {
        title: 'View Details',
        description: 'Search for models and view public/private details',
        scope: 'ViewDetails'
      },
      {
        title: 'Edit Details',
        description: 'Edit basic details of a model',
        scope: 'EditDetails'
      },
      {
        title: 'Download Assets',
        description: 'Download purchased add-ons and colormap imagery',
        scope: 'DownloadAssets'
      },
      {
        title: 'Purchase Assets',
        description: "Purchase assets for a model on the user's behalf",
        scope: 'PurchaseAssets'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        redirect_uri: ctx.redirectUri,
        state: ctx.state
      });

      return {
        url: `https://authn.matterport.com/oauth/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      return {
        output: await exchangeToken({
          grant_type: 'authorization_code',
          code: ctx.code,
          scope: ctx.scopes.join(' '),
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri
        })
      };
    },

    handleTokenRefresh: async (ctx: {
      output: { token: string; refreshToken?: string };
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken) {
        throw createApiServiceError(
          'Matterport did not provide a refresh token. Reconnect your account.'
        );
      }
      return {
        output: await exchangeToken(
          {
            grant_type: 'refresh_token',
            refresh_token: ctx.output.refreshToken,
            client_id: ctx.clientId,
            client_secret: ctx.clientSecret
          },
          ctx.output.refreshToken
        )
      };
    }
  });

let exchangeToken = async (params: Record<string, string>, previousRefreshToken?: string) => {
  try {
    let response = await createAxios().post(
      'https://api.matterport.com/api/oauth/token',
      new URLSearchParams(params).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    let data = response.data;
    let seconds = data?.expires_in;
    if (
      typeof seconds !== 'number' ||
      !Number.isFinite(seconds) ||
      seconds <= 0 ||
      Date.now() + seconds * 1000 > 8.64e15
    ) {
      throw createApiServiceError(
        'Matterport returned an invalid token expiry. Reconnect your account.'
      );
    }
    if (
      data.refresh_token != null &&
      (typeof data.refresh_token !== 'string' || !data.refresh_token)
    ) {
      throw createApiServiceError(
        'Matterport returned an invalid refresh token. Reconnect your account.'
      );
    }
    let tokens = normalizeOAuthTokenResponse(data, {
      providerLabel: 'Matterport',
      required: true,
      expiresInType: 'number',
      previousRefreshToken
    });
    if (!tokens.refreshToken) {
      throw createApiServiceError(
        'Matterport did not provide a refresh token. Reconnect your account.'
      );
    }
    return { ...tokens, authType: 'bearer' as const };
  } catch (error) {
    throw matterportError(
      error,
      [params.client_secret, params.code, params.refresh_token].filter(
        (value): value is string => !!value
      )
    );
  }
};
