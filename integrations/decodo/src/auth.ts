import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'Base64-encoded Basic Auth token (username:password) for Web Scraping API, or API key for Public API'
        ),
      authMethod: z
        .enum(['basic', 'api_key'])
        .describe('Which authentication method is being used')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Basic Auth (Web Scraping API)',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Web Scraping API username from the Decodo dashboard'),
      password: z.string().describe('Web Scraping API password from the Decodo dashboard')
    }),
    getOutput: async (ctx: { input: { username: string; password: string } }) => {
      let encoded = btoa(`${ctx.input.username}:${ctx.input.password}`);
      return {
        output: {
          token: encoded,
          authMethod: 'basic' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { username: string; password: string };
    }) => {
      let decoded = atob(ctx.output.token);
      let username = decoded.split(':')[0];
      return {
        profile: {
          name: username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key (Public API)',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe('API key from the Decodo dashboard (Account Settings > API Keys)')
    }),
    getOutput: async (ctx: { input: { token: string } }) => {
      return {
        output: {
          token: ctx.input.token,
          authMethod: 'api_key' as const
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; authMethod: string };
      input: { token: string };
    }) => {
      let axiosInstance = createAxios({
        baseURL: 'https://api.decodo.com/v2',
        headers: {
          Authorization: ctx.output.token
        }
      });
      try {
        let response = await axiosInstance.get('/subscriptions');
        let subscriptions = response.data;
        return {
          profile: {
            subscriptions
          }
        };
      } catch {
        return {
          profile: {}
        };
      }
    }
  });
