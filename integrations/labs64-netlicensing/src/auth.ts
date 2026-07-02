import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'basic_auth',

    inputSchema: z.object({
      username: z.string().describe('NetLicensing vendor account username'),
      password: z.string().describe('NetLicensing vendor account password')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.username}:${ctx.input.password}`);
      return {
        output: {
          token: encoded,
          username: ctx.input.username
        }
      };
    }
  })
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',

    inputSchema: z.object({
      apiKey: z.string().describe('NetLicensing API Key')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`apiKey:${ctx.input.apiKey}`);
      return {
        output: {
          token: encoded,
          username: 'apiKey'
        }
      };
    }
  });
