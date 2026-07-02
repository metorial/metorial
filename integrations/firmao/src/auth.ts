import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded API login:password for Basic Authentication')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',

    inputSchema: z.object({
      apiLogin: z.string().describe('API login from Firmao API settings panel'),
      apiPassword: z.string().describe('API password generated in Firmao API settings panel')
    }),

    getOutput: async ctx => {
      let credentials = `${ctx.input.apiLogin}:${ctx.input.apiPassword}`;
      let token = btoa(credentials);
      return {
        output: {
          token
        }
      };
    }
  });
