import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { LeadfeederClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string().describe('Existing Leadfeeder legacy API token'),
      ipEnrichToken: z
        .string()
        .optional()
        .describe('IP-Enrich API key for the lf-discover API')
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Legacy API Token',
    key: 'api_token',
    inputSchema: z.object({
      apiToken: z
        .string()
        .describe(
          'Existing Leadfeeder legacy API token. Newly issued API keys for the /v1 API are not supported by these legacy endpoints.'
        ),
      ipEnrichApiKey: z
        .string()
        .optional()
        .describe(
          'Existing legacy IP-Enrich API key, separate from the main legacy token and required for IP enrichment. New legacy keys are no longer issued.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.apiToken.trim()) {
        throw createApiServiceError('Provide an existing Leadfeeder legacy API token.');
      }
      return {
        output: {
          token: ctx.input.apiToken,
          ipEnrichToken: ctx.input.ipEnrichApiKey
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; ipEnrichToken?: string };
      input: { apiToken: string; ipEnrichApiKey?: string };
    }) => {
      let client = new LeadfeederClient(ctx.output.token);
      let accounts = await client.getAccounts();
      let firstAccount = accounts[0];
      if (!firstAccount) {
        throw createApiServiceError(
          'No Leadfeeder accounts are available for this token. Check its account access.'
        );
      }

      return {
        profile: {
          id: firstAccount.accountId,
          name: firstAccount.name
        }
      };
    }
  });
