import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List organizations accessible to the authenticated user. Organizations are top-level entities containing workspaces, teams, and members.`,
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
            orgId: z.number().optional().describe('Organization ID'),
            name: z.string().optional().describe('Organization short name'),
            fullName: z.string().optional().describe('Organization full name'),
            description: z.string().optional().describe('Organization description'),
            website: z.string().optional().describe('Organization website URL'),
            memberRole: z.string().optional().describe('Current user role in the organization')
          })
        )
        .describe('List of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let orgs = await client.listOrganizations();

    let organizations = orgs.map(o => ({
      orgId: o.orgId,
      name: o.name,
      fullName: o.fullName,
      description: o.description,
      website: o.website,
      memberRole: o.memberRole
    }));

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organizations.`
    };
  })
  .build();
