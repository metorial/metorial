import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProfile = SlateTool.create(spec, {
  name: 'Get Profile',
  key: 'get_profile',
  description: `Retrieve a specific customer profile by ID. Returns detailed information including email, approximate address, and commerce transaction summary.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      profileId: z.string().describe('The unique identifier of the profile to retrieve')
    })
  )
  .output(
    z.object({
      profile: z.any().describe('Complete profile data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let profile = await client.getProfile(ctx.input.profileId);

    return {
      output: {
        profile
      },
      message: `Retrieved profile **${profile.email || profile.id || ctx.input.profileId}**.`
    };
  })
  .build();
