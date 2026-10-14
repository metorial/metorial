import { SlateAuth } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'Access Token',
    key: 'access_token',

    inputSchema: z.object({
      baseUrl: z
        .string()
        .url()
        .default('https://api.cloud.seqera.io')
        .describe(
          'Seqera Platform API URL. Use the default for Cloud or the API URL for your Enterprise deployment.'
        ),
      token: z
        .string()
        .describe(
          'Seqera Platform personal access token. Generate one from User tokens in your Seqera UI.'
        )
    }),

    getOutput: async ctx => {
      return {
        output: {
          token: ctx.input.token,
          baseUrl: ctx.input.baseUrl
        }
      };
    },

    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      let client = new SeqeraClient({ token: ctx.output.token, baseUrl: ctx.output.baseUrl });
      let { user } = await client.getUserInfo();
      let name = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.userName;

      return {
        profile: {
          id: user?.id != null ? String(user.id) : undefined,
          email: user?.email ?? undefined,
          name: name || undefined,
          imageUrl: user?.avatar ?? undefined
        }
      };
    }
  });
