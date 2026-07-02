import { SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

let profileSchema = z.object({
  profileId: z.string().describe('Unique identifier for the profile'),
  fingerprint: z.string().optional().describe('Unique fingerprint for the profile'),
  name: z.string().describe('Name of the profile')
});

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `List all DNS configuration profiles in the NextDNS account. Returns a summary of each profile including its ID and name. Use this to discover available profiles before performing operations on them.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('List of DNS profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let result = await client.listProfiles();
    let profiles = (result.data || []).map((p: any) => ({
      profileId: p.id,
      fingerprint: p.fingerprint,
      name: p.name
    }));

    return {
      output: { profiles },
      message: `Found **${profiles.length}** profile(s).`
    };
  })
  .build();
