import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Organization Profiles',
  key: 'list_profiles',
  description: `Retrieve all organization profiles associated with your DIDs. Profiles contain branding and display information used when issuing and verifying credentials.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      offset: z.number().optional().describe('Number of items to skip for pagination'),
      limit: z.number().optional().describe('Maximum number of items to return (max 64)')
    })
  )
  .output(
    z.object({
      profiles: z.array(
        z.object({
          did: z.string().describe('Associated DID'),
          profileName: z.string().optional().describe('Organization name'),
          profileDescription: z.string().optional().describe('Organization description'),
          logo: z.string().optional().describe('Logo URL')
        })
      ),
      total: z.number().optional().describe('Total number of profiles')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listProfiles({
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let list = Array.isArray(result) ? result : result?.list || [];
    let total = result?.total;

    let profiles = list.map((p: any) => ({
      did: p.did || p.id || '',
      profileName: p.name,
      profileDescription: p.description,
      logo: p.logo
    }));

    return {
      output: { profiles, total },
      message: `Found **${profiles.length}** organization profile(s)${total != null ? ` out of ${total} total` : ''}.`
    };
  })
  .build();
