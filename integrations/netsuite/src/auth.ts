import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('OAuth 2.0 access token or TBA token identifier'),
      refreshToken: z.string().optional().describe('OAuth 2.0 refresh token'),
      expiresAt: z.string().optional().describe('Token expiration timestamp (ISO 8601)'),
      accountId: z.string().describe('NetSuite account ID used for constructing API base URL'),
      consumerKey: z.string().optional().describe('Consumer key for TBA (OAuth 1.0)'),
      consumerSecret: z.string().optional().describe('Consumer secret for TBA (OAuth 1.0)'),
      tokenId: z.string().optional().describe('Token ID for TBA (OAuth 1.0)'),
      tokenSecret: z.string().optional().describe('Token secret for TBA (OAuth 1.0)'),
      authType: z.enum(['oauth2', 'tba']).describe('Authentication type being used')
    })
  )
  .addOauth({
    type: 'auth.oauth',
    name: 'OAuth 2.0',
    key: 'oauth2',

    scopes: [
      {
        title: 'REST Web Services',
        description:
          'Access to NetSuite REST Web Services API for record CRUD and SuiteQL queries',
        scope: 'rest_webservices'
      },
      {
        title: 'RESTlets',
        description: 'Access to custom RESTlet endpoints deployed in NetSuite',
        scope: 'restlets'
      }
    ],

    inputSchema: z.object({
      accountId: z
        .string()
        .describe('NetSuite Account ID (e.g., "1234567" or "1234567_SB1" for sandbox)')
    }),

    getAuthorizationUrl: async ctx => {
      let accountId = ctx.input.accountId.replace(/-/g, '_').toUpperCase();
      let scopeString = ctx.scopes.join(' ');
      let params = new URLSearchParams({
        response_type: 'code',
        client_id: ctx.clientId,
        redirect_uri: ctx.redirectUri,
        scope: scopeString,
        state: ctx.state
      });

      let url = `https://${accountId}.app.netsuite.com/app/login/oauth2/authorize.nl?${params.toString()}`;

      return {
        url,
        input: { accountId }
      };
    },

    handleCallback: async ctx => {
      let accountId = ctx.input.accountId.replace(/-/g, '_').toUpperCase();
      let tokenUrl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let httpClient = createAxios();
      let response = await httpClient.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: ctx.code,
          redirect_uri: ctx.redirectUri
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt,
          accountId,
          authType: 'oauth2' as const
        },
        input: { accountId }
      };
    },

    handleTokenRefresh: async (ctx: any) => {
      let accountId = ctx.output.accountId;
      let tokenUrl = `https://${accountId}.suitetalk.api.netsuite.com/services/rest/auth/oauth2/v1/token`;

      let credentials = Buffer.from(`${ctx.clientId}:${ctx.clientSecret}`).toString('base64');

      let httpClient = createAxios();
      let response = await httpClient.post(
        tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: ctx.output.refreshToken || ''
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`
          }
        }
      );

      let data = response.data;
      let expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

      return {
        output: {
          token: data.access_token,
          refreshToken: data.refresh_token || ctx.output.refreshToken,
          expiresAt,
          accountId,
          authType: 'oauth2' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Token-Based Authentication (TBA)',
    key: 'tba',

    inputSchema: z.object({
      accountId: z
        .string()
        .describe('NetSuite Account ID (e.g., "1234567" or "1234567_SB1" for sandbox)'),
      consumerKey: z.string().describe('Consumer Key from the Integration Record in NetSuite'),
      consumerSecret: z
        .string()
        .describe('Consumer Secret from the Integration Record in NetSuite'),
      tokenId: z.string().describe('Token ID generated from the Access Token in NetSuite'),
      tokenSecret: z
        .string()
        .describe('Token Secret generated from the Access Token in NetSuite')
    }),

    getOutput: async ctx => {
      let accountId = ctx.input.accountId.replace(/-/g, '_').toUpperCase();

      return {
        output: {
          token: ctx.input.tokenId,
          accountId,
          consumerKey: ctx.input.consumerKey,
          consumerSecret: ctx.input.consumerSecret,
          tokenId: ctx.input.tokenId,
          tokenSecret: ctx.input.tokenSecret,
          authType: 'tba' as const
        }
      };
    }
  });
