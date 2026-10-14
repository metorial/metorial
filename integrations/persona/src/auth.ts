import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Persona API key. Production keys start with persona_production, sandbox keys start with persona_sandbox.'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) throw createApiServiceError('Provide a non-empty Persona API key.');
      return {
        output: {
          token
        }
      };
    }
  });
