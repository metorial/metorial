import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      userId: z.number().optional(),
      userEmail: z.string().optional(),
      teamId: z.number().optional()
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
          'Reply.io API key from Settings > API Key. V3 uses Bearer authentication; legacy actions use X-API-Key and require legacy:use for scoped keys.'
        ),
      userId: z
        .number()
        .optional()
        .describe(
          'Optional resolved user ID for team or organization keys; choose userId or userEmail.'
        ),
      userEmail: z
        .string()
        .optional()
        .describe(
          'Optional user email for team or organization keys. Organization keys also require teamId with this option.'
        ),
      teamId: z
        .number()
        .optional()
        .describe(
          'Team ID when resolving userEmail with an organization key; discover it with a user-scoped connection first.'
        )
    }),
    getOutput: async ctx => {
      const output = {
        token: ctx.input.apiKey,
        userId: ctx.input.userId,
        userEmail: ctx.input.userEmail,
        teamId: ctx.input.teamId
      };
      new Client(output);
      return { output };
    },
    getProfile: async (ctx: {
      output: { token: string; userId?: number; userEmail?: string; teamId?: number };
    }) => {
      const user = await new Client(ctx.output).getCurrentUser();
      return {
        profile: {
          id: String(user.userId),
          name: user.username ?? `Reply.io user ${user.userId}`
        }
      };
    }
  });
