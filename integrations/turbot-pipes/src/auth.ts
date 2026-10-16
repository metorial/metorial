import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      baseUrl: z.string().optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Token',
    key: 'api_token',
    inputSchema: z.object({
      token: z
        .string()
        .describe(
          'Turbot Pipes API token. Generate one under Advanced > Credentials & Access.'
        ),
      baseUrl: z
        .string()
        .optional()
        .describe(
          'API base URL for your Pipes tenant, including /api/v0. Defaults to https://pipes.turbot.com/api/v0; use your enterprise tenant domain when applicable.'
        )
    }),
    getOutput: async ctx => ({
      output: {
        token: ctx.input.token,
        baseUrl: ctx.input.baseUrl ?? 'https://pipes.turbot.com/api/v0'
      }
    }),
    getProfile: async (ctx: { output: { token: string; baseUrl?: string } }) => {
      let actor = await new Client({
        token: ctx.output.token,
        baseUrl: ctx.output.baseUrl ?? 'https://pipes.turbot.com/api/v0'
      }).getActor();
      return {
        profile: {
          id: actor.id,
          name: actor.displayName ?? actor.handle,
          email: actor.email,
          handle: actor.handle,
          imageUrl: actor.avatarUrl
        }
      };
    }
  });
