import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let api = createAxios({
  baseURL: 'https://api.agencyzoom.com'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      apiKey: z.string().optional(),
      apiSecret: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'username_password',
    inputSchema: z.object({
      username: z.string().describe('AgencyZoom account email address'),
      password: z.string().describe('AgencyZoom account password')
    }),
    getOutput: async ctx => {
      let response = await api.post('/v1/api/auth/login', {
        username: ctx.input.username,
        password: ctx.input.password
      });
      let token = response.data?.token || response.data;
      return {
        output: {
          token: typeof token === 'string' ? token : String(token)
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Secret',
    key: 'api_key_secret',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('API Key from AgencyZoom integrations page (Zapier section)'),
      apiSecret: z
        .string()
        .describe('API Secret from AgencyZoom integrations page (Zapier section)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: '',
          apiKey: ctx.input.apiKey,
          apiSecret: ctx.input.apiSecret
        }
      };
    }
  });
