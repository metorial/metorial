import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Access token for Appcircle API requests')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Personal Access Key',
    key: 'personal_access_key',

    inputSchema: z.object({
      personalAccessKey: z
        .string()
        .describe(
          'Personal Access Key generated from My Organization > Security in the Appcircle dashboard'
        ),
      authBaseUrl: z
        .string()
        .default('https://auth.appcircle.io')
        .describe('Auth base URL. Change for self-hosted deployments.')
    }),

    getOutput: async ctx => {
      let http = createAxios();

      let response = await http.post(
        `${ctx.input.authBaseUrl}/auth/v3/token`,
        `personalAccessKey=${encodeURIComponent(ctx.input.personalAccessKey)}`,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json'
          }
        }
      );

      let token = response.data?.access_token ?? response.data;

      return {
        output: {
          token: typeof token === 'string' ? token : String(token)
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKeyName: z.string().describe('Name of the API Key'),
      apiKeySecret: z.string().describe('Secret of the API Key'),
      organizationId: z
        .string()
        .optional()
        .describe('Organization ID (required for sub-organizations)'),
      authBaseUrl: z
        .string()
        .default('https://auth.appcircle.io')
        .describe('Auth base URL. Change for self-hosted deployments.')
    }),

    getOutput: async ctx => {
      let http = createAxios();

      let body = `name=${encodeURIComponent(ctx.input.apiKeyName)}&secret=${encodeURIComponent(ctx.input.apiKeySecret)}`;
      if (ctx.input.organizationId) {
        body += `&organizationId=${encodeURIComponent(ctx.input.organizationId)}`;
      }

      let response = await http.post(`${ctx.input.authBaseUrl}/auth/v1/api-key/token`, body, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json'
        }
      });

      let token = response.data?.access_token ?? response.data;

      return {
        output: {
          token: typeof token === 'string' ? token : String(token)
        }
      };
    }
  });
