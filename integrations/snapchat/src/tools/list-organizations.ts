import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { SnapchatClient } from '../lib/client';
import { spec } from '../spec';

let organizationSchema = z.object({
  organizationId: z.string().describe('Unique ID of the organization'),
  name: z.string().describe('Name of the organization'),
  type: z.string().optional().describe('Organization type'),
  status: z.string().optional().describe('Organization status'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all Snapchat organizations accessible to the authenticated user. Returns organization IDs, names, and statuses. Use this to discover available organizations before managing ad accounts or campaigns.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      organizations: z.array(organizationSchema).describe('List of organizations'),
      nextLink: z
        .string()
        .optional()
        .describe('Pagination URL for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnapchatClient(ctx.auth.token);
    let result = await client.listOrganizations();

    let organizations = result.items.map((org: any) => ({
      organizationId: org.id,
      name: org.name,
      type: org.type,
      status: org.status,
      createdAt: org.created_at,
      updatedAt: org.updated_at
    }));

    return {
      output: { organizations, nextLink: result.nextLink },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
