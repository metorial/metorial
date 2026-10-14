import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  normalizeOAuthTokenResponse,
  SlateAuth
} from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

type MuralAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  authType?: 'oauth' | 'apikey';
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      authType: z.enum(['oauth', 'apikey']).optional()
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
        url: 'https://developers.mural.co/public/docs/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.mural.co/public/docs/scopes'
      }
    ],

    scopes: [
      {
        title: 'Invite Workspace Members',
        description: 'Invite collaborators to workspaces.',
        scope: 'workspaces:write'
      },
      {
        title: 'Read Identity',
        description: "View a user's name, avatar, and company information.",
        scope: 'identity:read'
      },
      {
        title: 'Read Murals',
        description: 'Retrieve information about murals from a room and/or workspace.',
        scope: 'murals:read'
      },
      {
        title: 'Write Murals',
        description: 'Create murals, manage settings and widgets.',
        scope: 'murals:write'
      },
      {
        title: 'Read Rooms',
        description: "Retrieve information about a workspace's rooms and room settings.",
        scope: 'rooms:read'
      },
      {
        title: 'Write Rooms',
        description: 'Create, update, and delete rooms and their properties.',
        scope: 'rooms:write'
      },
      {
        title: 'Read Users',
        description: 'Retrieve information about users and their permission levels.',
        scope: 'users:read'
      },
      {
        title: 'Read Workspaces',
        description: 'Retrieve information about workspaces, settings, and properties.',
        scope: 'workspaces:read'
      },
      {
        title: 'Read Templates',
        description:
          "Retrieve a workspace's custom template names, descriptions, and categories.",
        scope: 'templates:read'
      },
      {
        title: 'Write Templates',
        description: 'Create a template from a mural or delete templates.',
        scope: 'templates:write'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        response_type: 'code'
      });

      return {
        url: `https://app.mural.co/api/public/v1/authorization/oauth2/?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAuthenticatedAxios({
        baseURL: 'https://app.mural.co/api/public/v1',
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Mural OAuth',
            reason: 'mural_oauth_error'
          })
      });
      let response = await axios.post(
        '/authorization/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Mural',
            required: true
          }),
          authType: 'oauth' as const
        }
      };
    },
    handleTokenRefresh: async (ctx: {
      output: MuralAuthOutput;
      clientId: string;
      clientSecret: string;
    }) => {
      if (!ctx.output.refreshToken)
        throw createApiServiceError(
          'A Mural refresh token is missing. Reconnect using OAuth.'
        );
      let axios = createAuthenticatedAxios({
        baseURL: 'https://app.mural.co/api/public/v1',
        contentType: 'application/x-www-form-urlencoded',
        errorAdapter: error =>
          buildApiServiceError(error, {
            providerLabel: 'Mural OAuth',
            reason: 'mural_oauth_error'
          })
      });
      let response = await axios.post(
        '/authorization/oauth2/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret
        }).toString()
      );
      return {
        output: {
          ...normalizeOAuthTokenResponse(response.data, {
            providerLabel: 'Mural',
            required: true,
            previousRefreshToken: ctx.output.refreshToken
          }),
          authType: 'oauth' as const
        }
      };
    },
    getProfile: async (ctx: { output: MuralAuthOutput }) => {
      let user = await new Client(ctx.output).getCurrentUser();
      return {
        profile: {
          id: user.id,
          email: user.email,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.id,
          imageUrl: user.avatar
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Enterprise API Key',
    key: 'enterprise_api_key',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Enterprise API key from Manage company > API keys. Canvas tools require the OAuth connection instead.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'apikey' as const
        }
      };
    }
  });
