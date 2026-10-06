import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from './lib/client';

export let auth = SlateAuth.create()
  .output(z.object({ token: z.string() }))
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      apiKey: z
        .string()
        .describe(
          'Rootly API key generated from Organization Settings > API Keys. Its assigned roles and scope control access.'
        )
    }),
    getOutput: async ctx => {
      new Client({ token: ctx.input.apiKey });
      return { output: { token: ctx.input.apiKey } };
    },
    getProfile: async (ctx: { output: { token: string } }) => {
      const result = await new Client({ token: ctx.output.token }).getCurrentUser();
      const user = flattenResource(result.data as JsonApiResource);
      if (typeof user.email !== 'string' || !user.email)
        throw createApiServiceError(
          'Rootly did not return a valid current-user profile. Check the API key role and account access.'
        );
      return {
        profile: {
          id: String(user.id),
          email: user.email,
          name:
            typeof user.full_name === 'string' && user.full_name ? user.full_name : user.email
        }
      };
    }
  });
