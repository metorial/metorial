import { createApiServiceError, createAxios, SlateAuth } from 'slates';
import { z } from 'zod';
import { wixApiError } from './lib/errors';

let validateContextIds = (siteId?: string, accountId?: string) => {
  if (siteId && accountId) {
    throw createApiServiceError('Use either siteId or accountId for Wix API calls, not both.');
  }
};

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      siteId: z.string().optional(),
      accountId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Wix API Key generated from the API Keys Manager'),
      siteId: z.string().optional().describe('Wix Site ID for site-level API calls'),
      accountId: z.string().optional().describe('Wix Account ID for account-level API calls')
    }),
    getOutput: async ctx => {
      validateContextIds(ctx.input.siteId, ctx.input.accountId);
      return {
        output: {
          token: ctx.input.apiKey,
          siteId: ctx.input.siteId,
          accountId: ctx.input.accountId
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'OAuth App Credentials',
    key: 'oauth_app',
    inputSchema: z.object({
      appId: z.string().describe('Wix App ID'),
      appSecret: z.string().describe('Wix App Secret Key'),
      instanceId: z
        .string()
        .describe('Wix App Instance ID (unique identifier for the app on a specific site)'),
      siteId: z.string().optional().describe('Wix Site ID for site-level API calls'),
      accountId: z.string().optional().describe('Wix Account ID for account-level API calls')
    }),
    getOutput: async ctx => {
      validateContextIds(ctx.input.siteId, ctx.input.accountId);
      let axios = createAxios({ baseURL: 'https://www.wixapis.com' });
      let response: { data: { access_token?: string } };
      try {
        response = await axios.post('/oauth2/token', {
          grant_type: 'client_credentials',
          client_id: ctx.input.appId,
          client_secret: ctx.input.appSecret,
          instance_id: ctx.input.instanceId
        });
      } catch (error) {
        throw wixApiError(error, 'create OAuth app access token');
      }

      if (!response.data.access_token) {
        throw createApiServiceError('Wix OAuth response did not include an access token.');
      }

      return {
        output: {
          token: response.data.access_token,
          siteId: ctx.input.siteId,
          accountId: ctx.input.accountId
        }
      };
    }
  });
