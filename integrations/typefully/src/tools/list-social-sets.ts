import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let listSocialSets = SlateTool.create(spec, {
  name: 'List Social Sets',
  key: 'list_social_sets',
  description: `List all available social sets (groups of connected platform accounts). Social set IDs are required for all draft and content operations. Use this to discover which social sets and platforms are available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      socialSets: z
        .array(
          z.object({
            socialSetId: z.string().describe('ID of the social set'),
            username: z.string().describe('Username associated with the social set'),
            name: z.string().describe('Display name of the social set'),
            profileImageUrl: z.string().nullable().describe('Profile image URL'),
            teamId: z.string().nullable().describe('Team ID, if part of a team'),
            teamName: z.string().nullable().describe('Team name, if part of a team')
          })
        )
        .describe('Available social sets'),
      totalCount: z.number().describe('Total number of social sets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    let result = await client.listSocialSets();

    let socialSets = result.results.map(ss => ({
      socialSetId: ss.id,
      username: ss.username,
      name: ss.name,
      profileImageUrl: ss.profile_image_url,
      teamId: ss.team?.id ?? null,
      teamName: ss.team?.name ?? null
    }));

    return {
      output: {
        socialSets,
        totalCount: result.count
      },
      message: `Found **${result.count}** social set(s): ${socialSets.map(s => `**${s.name}** (@${s.username})`).join(', ')}`
    };
  })
  .build();
