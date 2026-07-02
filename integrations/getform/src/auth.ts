import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z
        .string()
        .describe(
          'API key for the Forminit API (X-API-Key header) or legacy Getform API token (query parameter).'
        )
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Your Forminit API key (starts with fi_) or legacy Getform form-specific API token. Generate from Account -> API Tokens in the Forminit dashboard, or find under Form Settings in the Getform dashboard.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token
        }
      };
    }
  });
