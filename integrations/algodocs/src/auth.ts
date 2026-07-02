import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let apiClient = createAxios({
  baseURL: 'https://api.algodocs.com/v1'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Your Algodocs API key from account settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; email?: string };
      input: { token: string };
    }) => {
      let response = await apiClient.get('/me', {
        headers: {
          'x-api-key': ctx.output.token
        }
      });
      return {
        profile: {
          name: response.data.FullName,
          email: response.data.EmailAddress
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth',
    key: 'basic_auth',
    inputSchema: z.object({
      email: z.string().describe('Your registered Algodocs email address'),
      token: z.string().describe('Your Algodocs API key from account settings')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          email: ctx.input.email
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; email?: string };
      input: { email: string; token: string };
    }) => {
      let credentials = Buffer.from(`${ctx.output.email}:${ctx.output.token}`).toString(
        'base64'
      );
      let response = await apiClient.get('/me', {
        headers: {
          Authorization: `Basic ${credentials}`
        }
      });
      return {
        profile: {
          name: response.data.FullName,
          email: response.data.EmailAddress
        }
      };
    }
  });
