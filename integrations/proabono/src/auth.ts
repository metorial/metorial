import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded Basic Auth credentials (agentKey:apiKey)')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Keys',
    key: 'api_keys',

    inputSchema: z.object({
      agentKey: z.string().describe('ProAbono Agent Key (Basic Auth username)'),
      apiKey: z.string().describe('ProAbono API Key (Basic Auth password)')
    }),

    getOutput: async ctx => {
      let encoded = btoa(`${ctx.input.agentKey}:${ctx.input.apiKey}`);
      return {
        output: {
          token: encoded
        }
      };
    }
  });
