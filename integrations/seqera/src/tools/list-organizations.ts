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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let orgs = await client.listOrganizations();

    let organizations = orgs.map(o => ({
      orgId: o.orgId ?? undefined,
      name: o.name ?? undefined,
      fullName: o.fullName ?? undefined,
      description: o.description ?? undefined,
      website: o.website ?? undefined,
      memberRole: o.memberRole ?? undefined
    }));

    return {
      output: { organizations },
      message: `Found **${organizations.length}** organizations.`
    };
  })
  .build();
