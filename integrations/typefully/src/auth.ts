import { SlateAuth } from 'slates';
import { z } from 'zod';
import { providerId, TypefullyClient } from './lib/client';

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
      apiKey: z.string().describe('Typefully API key (create one in Settings → API)')
    }),
    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.apiKey
        }
      };
    },
    getProfile: async (ctx: { output: { token: string }; input: { apiKey: string } }) => {
      let user = await new TypefullyClient(ctx.output.token).getCurrentUser();

      return {
        profile: {
          id: providerId(user.id),
          name: user.name ?? undefined,
          email: user.email ?? undefined,
          imageUrl: user.profile_image_url ?? undefined
        }
      };
    }
  });
