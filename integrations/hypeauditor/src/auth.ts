import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      clientId: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'Client ID + API Token',
    key: 'client_id_token',
    inputSchema: z.object({
      clientId: z.string().describe('Your HypeAuditor Client ID (X-Auth-Id header)'),
      token: z.string().describe('Your HypeAuditor API Token (X-Auth-Token header)')
    }),
    getOutput: async ctx => {
      if (!ctx.input.clientId.trim() || !ctx.input.token.trim()) {
        throw createApiServiceError('Enter a HypeAuditor Client ID and API token.');
      }
      return {
        output: {
          token: ctx.input.token.trim(),
          clientId: ctx.input.clientId.trim()
        }
      };
    }
  });
