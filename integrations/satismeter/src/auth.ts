import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API Key for Bearer token authentication (REST API v3)'),
      writeKey: z.string().describe('Write Key used for inserting responses and users')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key & Write Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z.string().describe('API Key found in SatisMeter Settings > Integrations > API'),
      writeKey: z
        .string()
        .describe('Write Key found in SatisMeter Settings > Integrations > API keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          writeKey: ctx.input.writeKey
        }
      };
    }
  });
