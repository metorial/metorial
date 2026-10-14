import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

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
          'Scrapfly API key (format: scp-live-xxx or scp-test-xxx). Found on the Scrapfly dashboard.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let account = await new Client(ctx.output.token).getAccount();
      let accountId =
        account?.account?.account_id ?? account?.account?.id ?? account?.project?.name;
      if (accountId === undefined || accountId === null) {
        throw createApiServiceError(
          'Scrapfly did not return an account identifier. Check the API key and try again.'
        );
      }

      return {
        profile: {
          id: String(accountId),
          name: account?.project?.name ?? 'Scrapfly Account'
        }
      };
    }
  });
