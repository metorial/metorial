import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { FluxguardClient } from './lib/client';

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
      token: z.string().describe('Fluxguard API key. Create one in your org settings.')
    }),

    getOutput: async ctx => {
      let token = ctx.input.token.trim();
      if (!token) {
        throw createApiServiceError(
          'Provide a Fluxguard API key from your organization settings.'
        );
      }
      return {
        output: {
          token
        }
      };
    },

    getProfile: async (ctx: { output: { token: string } }) => {
      let client = new FluxguardClient(ctx.output.token);
      let account = await client.getAccount();
      if (!account || typeof account !== 'object' || Array.isArray(account)) {
        throw createApiServiceError('Fluxguard returned invalid account data.');
      }

      return {
        profile: {
          id: account.orgId ?? account.id ?? undefined,
          name: account.orgName ?? account.name ?? undefined,
          email: account.email ?? undefined
        }
      };
    }
  });
