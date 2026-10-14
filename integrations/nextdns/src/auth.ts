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
          'NextDNS API key found at the bottom of your account page at https://my.nextdns.io/account'
        )
    }),
    getOutput: async ctx => {
      let token = ctx.input.apiKey.trim();
      if (!token) {
        throw createApiServiceError('Enter a NextDNS API key from your account page.', {
          reason: 'nextdns_api_key_required'
        });
      }

      return {
        output: {
          token
        }
      };
    }
  });
