import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from './lib/client';

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
      token: z
        .string()
        .describe(
          'Gigasheet API key. Generate one under Automation in your Library at app.gigasheet.com after API access is enabled.'
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.token.trim())
        throw createApiServiceError('A Gigasheet API key is required.');
      return {
        output: {
          token: ctx.input.token
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      let client = new GigasheetClient({ token: ctx.output.token });
      let response = await client.whoami();
      let details = await client.getUserDetails();
      let id = details?.Id ?? response?.username;
      if (typeof id !== 'string' || !id.trim()) {
        throw createApiServiceError(
          'Gigasheet did not return an authenticated user identity. Check your API key.'
        );
      }

      return {
        profile: {
          id,
          email: typeof details?.Email === 'string' ? details.Email : response?.username,
          name: typeof details?.Name === 'string' ? details.Name : response?.username
        }
      };
    }
  });
