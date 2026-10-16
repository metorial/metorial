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
          'Your IP2WHOIS API key. Sign up at https://www.ip2whois.com/register to get one.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim()) {
        throw createApiServiceError('Provide your IP2WHOIS API key.', {
          reason: 'ip2whois_api_key_required'
        });
      }
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    }
  });
