import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      username: z.string().optional(),
      password: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z.string().describe('Ascora API key from Administration → API Settings')
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
    name: 'Basic Authentication (Accounting API)',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Ascora account username'),
      password: z.string().describe('Ascora account password')
    }),
    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.username}:${ctx.input.password}`);
      return {
        output: {
          token: encoded,
          username: ctx.input.username,
          password: ctx.input.password
        }
      };
    }
  });
