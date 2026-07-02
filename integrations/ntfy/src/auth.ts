import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().optional().describe('Access token (tk_...) for Bearer authentication'),
      username: z.string().optional().describe('Username for Basic authentication'),
      password: z.string().optional().describe('Password for Basic authentication')
    })
  )
  .addNone()
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',
    inputSchema: z.object({
      token: z.string().describe('Ntfy access token (starts with tk_)')
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
    name: 'Username & Password',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Ntfy username'),
      password: z.string().describe('Ntfy password')
    }),
    getOutput: async ctx => {
      return {
        output: {
          username: ctx.input.username,
          password: ctx.input.password
        }
      };
    }
  });
