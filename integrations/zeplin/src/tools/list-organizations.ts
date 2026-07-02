import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all Zeplin organizations (workspaces) that the authenticated user is a member of. Returns organization names, IDs, and logos.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationId: z.string().describe('Organization identifier'),
            name: z.string().describe('Organization name'),
            logo: z.string().optional().describe('Organization logo URL')
          })
        )
        .describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let orgs = (await client.listOrganizations()) as any[];

    let mapped = orgs.map((o: any) => ({
      organizationId: o.id,
      name: o.name,
      logo: o.logo
    }));

    return {
      output: { organizations: mapped },
      message: `Found **${mapped.length}** organization(s).`
    };
  })
  .build();
