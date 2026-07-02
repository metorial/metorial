import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe('Strapi API token created in Settings → Global Settings → API Tokens')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'JWT Login',
    key: 'jwt_login',
    inputSchema: z.object({
      baseUrl: z
        .string()
        .describe('Base URL of your Strapi instance (e.g., https://your-strapi-instance.com)'),
      identifier: z.string().describe('Email or username for login'),
      password: z.string().describe('Password for login')
    }),
    getOutput: async ctx => {
      let axios = createAxios({
        baseURL: ctx.input.baseUrl.replace(/\/+$/, '')
      });

      let response = await axios.post('/api/auth/local', {
        identifier: ctx.input.identifier,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.jwt
        }
      };
    }
  });
