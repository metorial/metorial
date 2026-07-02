import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Brandfetch API key (Bearer token) for the Brand API and Transaction API'),
      clientId: z
        .string()
        .optional()
        .describe('Brandfetch Client ID for the Logo API and Brand Search API')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          clientId: ctx.input.clientId
        }
      };
    }
  });
