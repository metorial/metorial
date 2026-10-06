import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { FivetranClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Base64-encoded API key:secret for Basic auth')
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Key & Secret',
    key: 'api_key_secret',

    inputSchema: z.object({
      apiKey: z.string().describe('Fivetran API key (Scoped or System key)'),
      apiSecret: z.string().describe('Fivetran API secret')
    }),

    getOutput: async ctx => {
      for (const value of [ctx.input.apiKey, ctx.input.apiSecret]) {
        if (!value.trim() || /[\s:]/.test(value))
          throw createApiServiceError(
            'Provide a valid API key and secret without whitespace or colons.'
          );
      }
      let encoded = Buffer.from(`${ctx.input.apiKey}:${ctx.input.apiSecret}`, 'utf8').toString(
        'base64'
      );
      return {
        output: {
          token: encoded
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      const current = await new FivetranClient(ctx.output.token).getAccount();

      return {
        profile: {
          id: current.account_id,
          name: current.account_name ?? 'Fivetran account'
        }
      };
    }
  });
