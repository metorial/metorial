import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { googleCloudVisionScopes } from './scopes';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      authMethod: z.enum(['api_key', 'oauth']),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'Google OAuth 2.0',
    key: 'google_oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://support.google.com/cloud/answer/15544987'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.google.com/identity/protocols/oauth2/scopes'
      }
    ],

    scopes: [
      {
        title: 'Cloud Platform',
        description: 'Full access to Google Cloud Platform resources including Cloud Vision',
        scope: googleCloudVisionScopes.cloudPlatform
      },
      {
        title: 'Cloud Vision',
        description: 'Access to Google Cloud Vision API',
        scope: googleCloudVisionScopes.cloudVision
      }
    ],

    getAuthorizationUrl: async ctx => {
      let params = new URLSearchParams({
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        scope: ctx.scopes.join(' '),
        state: ctx.state,
        access_type: 'offline',
        prompt: 'consent'
      });

      return {
        url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let axios = createAxios();

      let response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          code: ctx.code,
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          redirect_uri: ctx.redirectUri,
          grant_type: 'authorization_code'
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let data = response.data;
      let grantedScopes =
        typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : undefined;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          authMethod: 'oauth' as const,
          refreshToken: data.refresh_token,
          expiresAt
        },
        scopes: grantedScopes
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error('No refresh token available');
      }

      let axios = createAxios();

      let response = await axios.post(
        'https://oauth2.googleapis.com/token',
        {
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken,
          grant_type: 'refresh_token'
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      let data = response.data;
      let expiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : undefined;

      return {
        output: {
          token: data.access_token,
          authMethod: 'oauth' as const,
          refreshToken: ctx.output.refreshToken,
          expiresAt
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      token: z.string().describe('Google Cloud API key with Vision API enabled')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_key' as const
        }
      };
    }
  });
