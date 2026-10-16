import { createHash, randomBytes } from 'node:crypto';
import {
  createApiServiceError,
  normalizeOAuthTokenResponse,
  SlateAuth,
  type SlateAuthWithOauth
} from 'slates';
import { z } from 'zod';

import { dubApi as api, Client } from './lib/client';

type AuthOutput = { token: string; refreshToken?: string; expiresAt?: string };
type OAuthMethod = SlateAuthWithOauth<Record<string, never>, AuthOutput>;

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
    name: 'OAuth',
    key: 'oauth',

    scopes: [
      {
        title: 'Write Links',
        description: 'Create, update, and delete links',
        scope: 'links.write'
      },
      {
        title: 'Write Tags',
        description: 'Create, update, and delete tags',
        scope: 'tags.write'
      },
      {
        title: 'Read Analytics',
        description: 'Retrieve analytics data for links and workspace',
        scope: 'analytics.read'
      },
      {
        title: 'Write Domains',
        description: 'Add and manage custom domains',
        scope: 'domains.write'
      },
      {
        title: 'Write Folders',
        description: 'Create and manage folders',
        scope: 'folders.write'
      },
      {
        title: 'Manage Customers',
        description: 'View, update, and delete customers',
        scope: 'customers.write'
      },
      {
        title: 'Read User',
        description: 'View user profile information',
        scope: 'user.read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = randomBytes(32).toString('base64url');
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        code_challenge: createHash('sha256').update(codeVerifier).digest('base64url'),
        code_challenge_method: 'S256'
      });

      return {
        url: `https://app.dub.co/oauth/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      let codeVerifier = ctx.callbackState?.codeVerifier;
      if (typeof codeVerifier !== 'string' || !codeVerifier)
        throw createApiServiceError(
          'Dub authorization state is missing. Reconnect your account.'
        );
      let response = await api.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          code: ctx.code,
          code_verifier: codeVerifier,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      return {
        output: normalizeOAuthTokenResponse(response.data, {
          providerLabel: 'Dub',
          required: true
        })
      };
    },

    handleTokenRefresh: async (
      ctx: Parameters<NonNullable<OAuthMethod['handleTokenRefresh']>>[0]
    ) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError('Dub refresh token is missing. Reconnect your account.');
      let response = await api.post(
        '/oauth/token',
        new URLSearchParams({
          client_id: ctx.clientId,
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

      return {
        output: {
          ...ctx.output,
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Dub',
            required: true,
            previousRefreshToken: ctx.output.refreshToken
          })
        }
      };
    },

    getProfile: async (ctx: Parameters<NonNullable<OAuthMethod['getProfile']>>[0]) => {
      let data = await new Client(ctx.output).getCurrentUser();
      return {
        profile: {
          id: data.id,
          name: data.name ?? data.id,
          imageUrl: data.image ?? undefined,
          workspaceId: data.workspace.id,
          workspaceName: data.workspace.name,
          workspaceSlug: data.workspace.slug
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Dub API key (starts with dub_)')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) throw createApiServiceError('Enter a Dub API key.');
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
