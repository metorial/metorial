import { SlateTool } from 'slates';
import { z } from 'zod';
import { XForceClient } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Retrieve the authenticated IBM X-Force Exchange user’s name, email, and account activity statistics.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      name: z.string().optional().describe('Display name'),
      givenName: z.string().optional().describe('Given name'),
      familyName: z.string().optional().describe('Family name'),
      email: z.string().optional().describe('Email address'),
      title: z.string().optional().describe('Job title'),
      memberSince: z.string().optional().describe('Account creation timestamp'),
      numberOfCollections: z.number().optional().describe('Number of collections'),
      numberOfComments: z.number().optional().describe('Number of comments'),
      numberOfGroups: z.number().optional().describe('Number of groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XForceClient(ctx.auth);
    let data = await client.getUserProfile();
    let profile = data.connectionsProfile ?? {};
    let statistics = data.statistics ?? data;

    return {
      output: {
        name: profile.fn ?? undefined,
        givenName: profile['given-name'] ?? undefined,
        familyName: profile['family-name'] ?? undefined,
        email: profile.email ?? undefined,
        title: profile.title ?? undefined,
        memberSince: statistics.memberSince ?? undefined,
        numberOfCollections: statistics.numberOfCollections ?? undefined,
        numberOfComments: statistics.numberOfComments ?? undefined,
        numberOfGroups: statistics.numberOfGroups ?? undefined
      },
      message: `Retrieved current user${profile.fn ? `: **${profile.fn}**` : ''}.`
    };
  })
  .build();
