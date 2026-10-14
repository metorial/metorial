import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let updateProfile = SlateTool.create(spec, {
  name: 'Rename Profile',
  key: 'update_profile',
  description:
    'Rename a NextDNS configuration profile. Call list_profiles to discover the profile ID.',
  tags: { destructive: false }
})
  .input(
    z.object({
      profileId: z
        .string()
        .describe('Profile ID. Call list_profiles to discover profile IDs.'),
      name: z.string().describe('New name for the profile')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('ID of the renamed profile'),
      name: z.string().describe('Updated profile name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    await client.updateProfile(ctx.input.profileId, { name: ctx.input.name });
    let result = await client.getProfile(ctx.input.profileId);

    return {
      output: { profileId: ctx.input.profileId, name: result.data.name },
      message: `Renamed profile \`${ctx.input.profileId}\` to **${result.data.name}**.`
    };
  })
  .build();
