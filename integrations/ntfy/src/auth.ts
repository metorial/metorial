import { createApiServiceError, SlateAuth } from 'slates';
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
      if (!ctx.input.token.trim()) {
        throw createApiServiceError('Provide a non-empty ntfy access token.');
      }
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
      username: z
        .string()
        .describe('Ntfy username, or an empty string when using a token as the password'),
      password: z.string().describe('Ntfy password, or an access token with an empty username')
    }),
    getOutput: async ctx => {
      if (!ctx.input.password || ctx.input.username.includes(':')) {
        throw createApiServiceError(
          'Provide a non-empty ntfy password or token and a username without a colon.'
        );
      }
      return {
        output: {
          username: ctx.input.username,
          password: ctx.input.password
        }
      };
    }
  });
