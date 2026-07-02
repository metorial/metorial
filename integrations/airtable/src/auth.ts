import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { airtableApiError, airtableServiceError } from './lib/errors';

let api = createAxios({
  baseURL: 'https://airtable.com'
});

let generateCodeVerifier = (): string => {
  let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  let randomValues = new Uint8Array(96);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < 96; i++) {
    result += chars[randomValues[i]! % chars.length];
  }
  return result;
};

let sha256Base64Url = async (plain: string): Promise<string> => {
  let encoder = new TextEncoder();
  let data = encoder.encode(plain);
  let hash = await crypto.subtle.digest('SHA-256', data);
  let bytes = new Uint8Array(hash);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

let tokenExpiresAt = (expiresIn: unknown) => {
  let seconds = typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? expiresIn : 3600;
  return new Date(Date.now() + seconds * 1000).toISOString();
};

type AirtableAuthOutput = {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
};

type AirtableOAuthRefreshContext = {
  output: AirtableAuthOutput;
  input: {};
  clientId: string;
  clientSecret: string;
  scopes: string[];
};

let getProfileFromToken = async (token: string, operation: string) => {
  let apiClient = createAxios({
    baseURL: 'https://api.airtable.com/v0',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  try {
    let response = await apiClient.get('/meta/whoami');
    let data = response.data;

    if (!data?.id || !data?.email) {
      throw airtableServiceError('Airtable profile response did not include an id and email.');
    }

    return {
      profile: {
        id: data.id,
        email: data.email,
        name: data.email
      }
    };
  } catch (error) {
    throw airtableApiError(error, operation);
  }
};

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
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://airtable.com/developers/web/guides/oauth-integrations'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://airtable.com/developers/web/api/scopes'
      }
    ],

    scopes: [
      {
        title: 'Read Records',
        description: 'Read records in tables',
        scope: 'data.records:read'
      },
      {
        title: 'Write Records',
        description: 'Create, update, and delete records in tables',
        scope: 'data.records:write'
      },
      {
        title: 'Read Comments',
        description: 'Read comments on records',
        scope: 'data.recordComments:read'
      },
      {
        title: 'Write Comments',
        description: 'Create, update, and delete comments on records',
        scope: 'data.recordComments:write'
      },
      {
        title: 'Read Schema',
        description: 'Read base schema (tables, fields, views)',
        scope: 'schema.bases:read'
      },
      {
        title: 'Write Schema',
        description: 'Create and modify tables and fields',
        scope: 'schema.bases:write'
      },
      {
        title: 'Manage Webhooks',
        description: 'Create and manage webhooks for real-time notifications',
        scope: 'webhook:manage'
      },
      {
        title: 'Read User Email',
        description: 'Read the authenticated user email address',
        scope: 'user.email:read'
      }
    ],

    getAuthorizationUrl: async ctx => {
      let codeVerifier = generateCodeVerifier();
      let codeChallenge = await sha256Base64Url(codeVerifier);

      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        scope: ctx.scopes.join(' ')
      });

      return {
        url: `https://airtable.com/oauth2/v1/authorize?${params.toString()}`,
        callbackState: { codeVerifier }
      };
    },

    handleCallback: async ctx => {
      if (!ctx.callbackState?.codeVerifier) {
        throw airtableServiceError('Airtable OAuth callback is missing a PKCE code verifier.');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: ctx.code,
        redirect_uri: ctx.redirectUri,
        code_verifier: ctx.callbackState.codeVerifier
      });

      let response: any;
      try {
        response = await api.post('/oauth2/v1/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        });
      } catch (error) {
        throw airtableApiError(error, 'exchange OAuth code');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw airtableServiceError(
          'Airtable OAuth token response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: tokenExpiresAt(data.expires_in)
        }
      };
    },

    handleTokenRefresh: async (ctx: AirtableOAuthRefreshContext) => {
      if (!ctx.output.refreshToken) {
        throw airtableServiceError('No Airtable refresh token available.');
      }

      let credentials = btoa(`${ctx.clientId}:${ctx.clientSecret}`);

      let params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: ctx.output.refreshToken
      });

      let response: any;
      try {
        response = await api.post('/oauth2/v1/token', params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        });
      } catch (error) {
        throw airtableApiError(error, 'refresh OAuth token');
      }

      let data = response.data;
      if (!data?.access_token) {
        throw airtableServiceError(
          'Airtable OAuth refresh response did not include an access token.'
        );
      }

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt: tokenExpiresAt(data.expires_in)
        }
      };
    },

    getProfile: async (ctx: { output: AirtableAuthOutput; input: {}; scopes: string[] }) => {
      return await getProfileFromToken(ctx.output.token, 'get OAuth profile');
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'Personal Access Token',
    key: 'personal_access_token',

    inputSchema: z.object({
      token: z.string().describe('Airtable Personal Access Token (starts with pat...)')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },

    getProfile: async (ctx: { output: { token?: string }; input: { token: string } }) => {
      let token = ctx.output.token ?? ctx.input.token;
      return await getProfileFromToken(token, 'get token profile');
    }
  });
