import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let fathomAxios = createAxios({
  baseURL: 'https://fathom.video/external/v1'
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
    name: 'OAuth',
    key: 'oauth',
    docs: [
      {
        type: 'docs.auth.oauth',
        name: 'OAuth documentation',
        url: 'https://developers.fathom.ai/oauth'
      },
      {
        type: 'docs.auth.oauth_scopes',
        name: 'OAuth scopes',
        url: 'https://developers.fathom.ai/sdks/oauth'
      }
    ],

    scopes: [
      {
        title: 'Public API',
        description:
          'Access to the Fathom public API including meetings, transcripts, summaries, and webhooks',
        scope: 'public_api'
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
        url: `https://fathom.video/external/v1/oauth2/authorize?${params.toString()}`
      };
    },

    handleCallback: async ctx => {
      let params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', ctx.code);
      params.append('client_id', ctx.clientId);
      params.append('client_secret', ctx.clientSecret);
      params.append('redirect_uri', ctx.redirectUri);

      let response = await fathomAxios.post('/oauth2/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
        }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', ctx.output.refreshToken || '');
      params.append('client_id', ctx.clientId);
      params.append('client_secret', ctx.clientSecret);

      let response = await fathomAxios.post('/oauth2/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      let data = response.data;

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: data.expires_in
            ? new Date(Date.now() + data.expires_in * 1000).toISOString()
            : undefined
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
        .describe(
          'Fathom API key generated from Settings → API Access in the Fathom dashboard'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
