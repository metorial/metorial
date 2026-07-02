import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Lists all organizations accessible to the authenticated user. For MSP accounts, returns all managed customer organizations. Useful for auditing tenants, selecting an organization for further operations, or building organization-level dashboards.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z
        .array(z.record(z.string(), z.any()))
        .describe('List of organization objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let organizations = await client.listOrganizations();

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
