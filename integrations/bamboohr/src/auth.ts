import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      companyDomain: z.string(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional()
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [
      {
        title: 'Offline Access',
        description: 'Enables refresh tokens for long-lived access',
        scope: 'offline_access'
      },
      {
        title: 'OpenID',
        description: 'Access to basic identity information',
        scope: 'openid'
      }
    ],

    inputSchema: z.object({
      companyDomain: z.string().describe('Your BambooHR company subdomain (e.g., "mycompany")')
    }),

    getAuthorizationUrl: async ctx => {
      let scopeString = ctx.scopes.join('+');
      let url = `https://${ctx.input.companyDomain}.bamboohr.com/authorize.php?request=authorize&state=${encodeURIComponent(ctx.state)}&response_type=code&scope=${scopeString}&client_id=${encodeURIComponent(ctx.clientId)}&redirect_uri=${encodeURIComponent(ctx.redirectUri)}`;

      return {
        url,
        input: ctx.input
      };
    },

    handleCallback: async ctx => {
      let http = createAxios({
        baseURL: `https://${ctx.input.companyDomain}.bamboohr.com`
      });

      let response = await http.post(
        '/token.php?request=token',
        new URLSearchParams({
          grant_type: 'authorization_code',
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

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          companyDomain: ctx.input.companyDomain,
          refreshToken: data.refresh_token,
          expiresAt
        },
        input: ctx.input
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      if (!ctx.output.refreshToken) {
        throw new Error(
          'No refresh token available. Ensure the offline_access scope was requested.'
        );
      }

      let http = createAxios({
        baseURL: `https://${ctx.input.companyDomain}.bamboohr.com`
      });

      let response = await http.post(
        '/token.php?request=token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: ctx.clientId,
          client_secret: ctx.clientSecret,
          refresh_token: ctx.output.refreshToken
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          companyDomain: ctx.output.companyDomain,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt
        },
        input: ctx.input
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('Your BambooHR API key'),
      companyDomain: z.string().describe('Your BambooHR company subdomain (e.g., "mycompany")')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          companyDomain: ctx.input.companyDomain
        }
      };
    }
  });
