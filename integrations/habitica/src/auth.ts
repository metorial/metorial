import { createApiServiceError, SlateAuth } from 'slates';
import { z } from 'zod';
import { HabiticaClient } from './lib/client';

export let auth = SlateAuth.create()
  .output(
    z.object({
      userId: z.string(),
      token: z.string(),
      xClient: z.string().optional()
    })
  )
  .addCustomAuth({
    type: 'auth.custom',
    name: 'API Credentials',
    key: 'api_credentials',
    inputSchema: z.object({
      userId: z
        .string()
        .describe('Habitica User ID, found under Settings > Site Data or Settings > API'),
      apiToken: z
        .string()
        .describe('Habitica API Token, found under Settings > Site Data or Settings > API'),
      xClient: z
        .string()
        .describe(
          "Application identifier in the format CreatorUserID-AppName, using the tool creator's Habitica User ID and application name."
        )
    }),
    getOutput: async ctx => {
      if (!ctx.input.xClient.trim()) {
        throw createApiServiceError(
          "Provide the tool creator's Habitica User ID and application name as CreatorUserID-AppName."
        );
      }
      return {
        output: {
          userId: ctx.input.userId.trim(),
          token: ctx.input.apiToken.trim(),
          xClient: ctx.input.xClient.trim()
        }
      };
    },
    getProfile: async (ctx: {
      output: { userId: string; token: string; xClient?: string };
    }) => {
      let user = await new HabiticaClient(ctx.output).getUser('profile,auth');
      return {
        profile: {
          id: ctx.output.userId,
          name: user.profile?.name || user.auth?.local?.username,
          imageUrl: user.profile?.imageUrl
        }
      };
    }
  });
