import { SlateAuth } from 'slates';
import { z } from 'zod';
import { Client } from './lib/client';
import { dataRegionSchema } from './lib/schemas';

export let auth = SlateAuth.create()
  .output(
    z.object({
      token: z.string(),
      dataRegion: dataRegionSchema.optional()
    })
  )
  .addTokenAuth({
    type: 'auth.token',
    name: 'API Key',
    key: 'api_key',
    inputSchema: z.object({
      token: z
        .string()
        .min(1)
        .describe(
          'Clockify API key. Generate from Profile Settings > Advanced tab > Manage API keys.'
        ),
      dataRegion: dataRegionSchema
        .default('global')
        .describe(
          'Clockify data region: global, euc1 (Germany), use2 (USA), euw2 (UK), or apse2 (Australia). Choose the region used by your workspace.'
        )
    }),
    getOutput: async ctx => ({
      output: { token: ctx.input.token, dataRegion: ctx.input.dataRegion }
    }),
    getProfile: async (ctx: {
      output: { token: string; dataRegion?: z.infer<typeof dataRegionSchema> };
    }) => {
      let user = await new Client({
        token: ctx.output.token,
        dataRegion: ctx.output.dataRegion ?? 'global'
      }).getCurrentUser();

      return {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          imageUrl: user.profilePicture || undefined
        }
      };
    }
  });
