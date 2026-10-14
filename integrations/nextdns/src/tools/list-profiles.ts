import { createApiServiceError, SlateTool } from 'slates';
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
  description: `List DNS configuration profiles in the NextDNS account. Returns a summary of each profile including its ID and name. Use this to discover available profiles before performing operations on them. Pass the returned cursor to retrieve another page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Positive integer number of profiles per page')
    })
  )
  .output(
    z.object({
      profiles: z.array(profileSchema).describe('List of DNS profiles'),
      cursor: z.string().optional().describe('Pagination cursor for the next page, if any')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    if (
      ctx.input.limit !== undefined &&
      (!Number.isInteger(ctx.input.limit) || ctx.input.limit < 1)
    ) {
      throw createApiServiceError('Profile list limit must be a positive integer.', {
        reason: 'nextdns_invalid_profiles_limit'
      });
    }
    let result = await client.listProfiles(ctx.input);
    let profiles = (result.data || []).map((p: any) => ({
      profileId: p.id,
      fingerprint: p.fingerprint,
      name: p.name
    }));

    return {
      output: { profiles, cursor: result.meta?.pagination?.cursor ?? undefined },
      message: `Found **${profiles.length}** profile(s).`
    };
  })
  .build();
