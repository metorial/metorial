import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client, id, object, text } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userId: z.number().optional(),
      teamId: z.number().optional()
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
          'Salesflare API key. Found in Settings > API keys in your Salesflare account.'
        )
    }),

    getOutput: async ctx => {
      const user = await new Client(ctx.input.token).getMe();
      return {
        output: {
          token: ctx.input.token,
          userId: user.id,
          teamId: id(object(user.team).id, 'team ID')
        }
      };
    },

    getProfile: async (ctx: { output: { token: string }; input: { token: string } }) => {
      const user = await new Client(ctx.output.token).getMe();

      return {
        profile: {
          id: String(user.id),
          email: typeof user.email === 'string' ? user.email : undefined,
          name: typeof user.name === 'string' ? user.name : text(user.email, 'profile name'),
          imageUrl: typeof user.picture === 'string' ? user.picture : undefined
        }
      };
    }
  });
