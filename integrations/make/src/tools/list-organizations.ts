import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { paging } from '../lib/schemas';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieve a bounded page of organizations that the authenticated user is a member of. Returns organization IDs, names, and zone information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
  .output(
    z.object({
      page: paging.optional(),
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
    const client = clientFor(ctx);
    const result = await client.listOrganizations(ctx.input);
    const organizations = result.organizations.map(o => ({
      organizationId: o.id,
      name: o.name,
      zone: o.zone,
      countryId: o.countryId,
      timezoneId: o.timezoneId
    }));
    return {
      output: { organizations, page: result.pg },
      message: `Returned ${organizations.length} authorized organizations in this region and page.`
    };
  })
  .build();
