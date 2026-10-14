import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description:
    'Retrieve a run profile by ID from list_profiles and check whether it is the default profile before starting a test or suite.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Run profile ID. Call list_profiles to discover available IDs.')
    })
  )
  .output(
    z.object({
      profileId: z.string(),
      name: z.string(),
      isDefault: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let profile = await new Client(ctx.auth).getProfile(ctx.input.profileId);
    return {
      output: { profileId: profile.id, name: profile.name, isDefault: profile.isDefault },
      message: `Retrieved run profile **${profile.name}**.`
    };
  })
  .build();
