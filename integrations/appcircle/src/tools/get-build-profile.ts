import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getBuildProfile = SlateTool.create(spec, {
  name: 'Get Build Profile',
  key: 'get_build_profile',
  description: `Retrieves detailed information about a specific build profile, including its connected repository, configurations, and recent build history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the build profile')
    })
  )
  .output(
    z
      .object({
        profileId: z.string().optional(),
        name: z.string().optional(),
        pinned: z.boolean().optional(),
        repositoryConnected: z.boolean().optional(),
        platformType: z.string().optional(),
        lastBuildDate: z.string().optional()
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let profile = await client.getBuildProfile(ctx.input.profileId);

    return {
      output: profile,
      message: `Retrieved build profile **${profile?.name ?? ctx.input.profileId}**.`
    };
  })
  .build();
