import { SlateTool } from 'slates';
import { z } from 'zod';
import { MakeClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieve all organizations that the authenticated user is a member of. Returns organization IDs, names, and zone information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(
        z.object({
          organizationId: z.number().describe('Organization ID'),
          name: z.string().optional().describe('Organization name'),
          zone: z.string().optional().describe('Zone identifier'),
          countryId: z.number().optional().describe('Country ID'),
          timezoneId: z.number().optional().describe('Timezone ID')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new MakeClient({
      token: ctx.auth.token,
      zoneUrl: ctx.config.zoneUrl
    });

    let result = await client.listOrganizations();
    let orgs = (result.organizations ?? result ?? []).map((o: any) => ({
      organizationId: o.id,
      name: o.name,
      zone: o.zone,
      countryId: o.countryId,
      timezoneId: o.timezoneId
    }));

    return {
      output: { organizations: orgs },
      message: `Found **${orgs.length}** organization(s).`
    };
  })
  .build();
