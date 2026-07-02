import { createAxios, SlateAuth } from 'slates';
import { z } from 'zod';

let studioAxios = createAxios({
  baseURL: 'https://api.gan.ai'
});

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      refreshToken: z.string().optional(),
      authType: z.enum(['playground', 'studio'])
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Playground API Key',
    key: 'playground_api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('API key from playground.gan.ai')
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          authType: 'playground' as const
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Studio Login',
    key: 'studio_login',

    inputSchema: z.object({
      email: z.string().describe('Email address for Gan.AI Studio'),
      password: z.string().describe('Password for Gan.AI Studio')
    }),

    getOutput: async ctx => {
      let response = await studioAxios.post('/users/login', {
        email: ctx.input.email,
        password: ctx.input.password
      });

      return {
        output: {
          token: response.data.access_token,
          refreshToken: response.data.refresh_token,
          authType: 'studio' as const
        }
      };
    }
  });
