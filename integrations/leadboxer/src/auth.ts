import { SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      accountEmail: z.string().optional()
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
          'Your LeadBoxer API key. Found at https://app.leadboxer.com/integrations-connectors/data/api-key'
        ),
      accountEmail: z
        .string()
        .optional()
        .describe(
          'The email address of the LeadBoxer account that owns this API key. Used for dataset discovery and lead details; it can also be provided when calling those tools.'
        )
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey,
          accountEmail: ctx.input.accountEmail
        }
      };
    }
  });
