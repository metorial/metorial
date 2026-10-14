import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      email: z.string()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',

    name: 'API Key + Email',
    key: 'api_key_email',

    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Your HelloLeads API key. Found in Settings > Integration in the HelloLeads web application.'
        ),
      email: z.string().describe('The email address associated with your HelloLeads account.')
    }),

    getOutput: async ctx => {
      if (!ctx.input.apiKey.trim() || !ctx.input.email.trim()) {
        throw createApiServiceError(
          'Provide your HelloLeads API key and account email address.'
        );
      }
      return {
        output: {
          token: ctx.input.apiKey,
          email: ctx.input.email
        }
      };
    }
  });
