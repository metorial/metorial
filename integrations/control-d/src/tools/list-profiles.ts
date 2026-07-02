import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listProfiles = SlateTool.create(spec, {
  name: 'List Profiles',
  key: 'list_profiles',
  description: `List all DNS filtering profiles in your Control D account. Each profile is a collection of rules and settings enforced on a DNS resolver. Returns profile names, IDs, and summary counts of filters, services, custom rules, and options configured on each.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      profiles: z.array(
        z.object({
          profileId: z.string().describe('Unique profile identifier'),
          name: z.string().describe('Profile name'),
          updated: z.number().describe('Last updated timestamp'),
          filterCount: z.number().describe('Number of active filters'),
          serviceCount: z.number().describe('Number of configured services'),
          ruleCount: z.number().describe('Number of custom rules'),
          folderCount: z.number().describe('Number of rule folders')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let profiles = await client.listProfiles();

    let mapped = profiles.map(p => ({
      profileId: p.PK,
      name: p.name,
      updated: p.updated,
      filterCount: p.profile.flt.count,
      serviceCount: p.profile.svc.count,
      ruleCount: p.profile.rule.count,
      folderCount: p.profile.grp.count
    }));

    return {
      output: { profiles: mapped },
      message: `Found **${mapped.length}** profile(s).`
    };
  })
  .build();
