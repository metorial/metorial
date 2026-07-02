import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Authorization header value for Kibana API requests')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('Encoded API key from Kibana (Stack Management > API Keys)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: `ApiKey ${ctx.input.apiKey}`
        }
      };
    }
  })
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Username & Password',
    key: 'basic_auth',
    inputSchema: z.object({
      username: z.string().describe('Kibana username'),
      password: z.string().describe('Kibana password')
    }),
    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.username}:${ctx.input.password}`);
      return {
        output: {
          token: `Basic ${encoded}`
        }
      };
    }
  });
