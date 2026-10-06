import { SlateAuth } from 'slates';
import { z } from 'zod';
import { credential } from './lib/contracts';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('API Key for Bearer token authentication (REST API v3)'),
      writeKey: z
        .string()
        .optional()
        .describe('Optional Write Key used only for inserting survey responses')
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
        .optional()
        .describe('Optional Write Key found in SatisMeter Settings > Integrations > API keys')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: credential(ctx.input.apiKey),
          writeKey:
            ctx.input.writeKey === undefined ? undefined : credential(ctx.input.writeKey)
        }
      };
    }
  });
