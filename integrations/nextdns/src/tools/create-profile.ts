import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let createProfile = SlateTool.create(spec, {
  name: 'Create Profile',
  key: 'create_profile',
  description: `Create a new NextDNS DNS configuration profile. Returns the ID and setup information for the newly created profile. After creation, configure security, privacy, and parental control settings using other tools.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new profile')
    })
  )
  .output(
    z.object({
      profileId: z.string().describe('ID of the newly created profile')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let result = await client.createProfile(ctx.input.name);
    let data = result.data || result;

    return {
      output: {
        profileId: data.id
      },
      message: `Created new profile **${ctx.input.name}** with ID \`${data.id}\`.`
    };
  })
  .build();
