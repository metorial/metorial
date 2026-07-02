import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { spec } from '../spec';

let orgSchema = z.object({
  organizationId: z.string().describe('Unique identifier of the organization'),
  name: z.string().describe('Name of the organization'),
  isDeleted: z.boolean().optional().describe('Whether the organization is deleted')
});

export let listOrganizationsTool = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all MongoDB Atlas organizations accessible with the current credentials. Organizations are the top-level entity containing projects and users.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      itemsPerPage: z.number().optional().describe('Number of results per page'),
      pageNum: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      organizations: z.array(orgSchema).describe('List of organizations'),
      totalCount: z.number().describe('Total number of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AtlasClient(ctx.auth);
    let result = await client.listOrganizations({
      itemsPerPage: ctx.input.itemsPerPage,
      pageNum: ctx.input.pageNum
    });

    let organizations = (result.results || []).map((o: any) => ({
      organizationId: o.id,
      name: o.name,
      isDeleted: o.isDeleted
    }));

    return {
      output: {
        organizations,
        totalCount: result.totalCount ?? organizations.length
      },
      message: `Found **${organizations.length}** organization(s).`
    };
  })
  .build();
