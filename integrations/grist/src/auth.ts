import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { GristClient, normalizeServerUrl } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      serverUrl: z.string()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe('Grist API key (generated from Profile Settings in the Grist UI)'),
      serverUrl: z
        .string()
        .describe(
          'Base URL of the Grist instance (e.g., "https://docs.getgrist.com", "https://myteam.getgrist.com", or a self-hosted URL)'
        )
    }),
    getOutput: async ctx => {
      let serverUrl = normalizeServerUrl(ctx.input.serverUrl);
      return {
        output: {
          token: ctx.input.apiKey,
          serverUrl
        }
      };
    },
    getProfile: async (ctx: {
      output: { token: string; serverUrl: string };
      input: { apiKey: string; serverUrl: string };
    }) => {
      let client = new GristClient(ctx.output);
      let user = await client.getCurrentUser();
      if (typeof user.id !== 'number' && typeof user.id !== 'string') {
        throw createApiServiceError('Grist did not return a user ID for this API key.');
      }
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name: user.name
        }
      };
    }
  });
