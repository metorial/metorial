import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieves the organizations associated with the authenticated user. Includes organization details like name, SSO status, and sub-organization relationships.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search filter for organization names'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Items per page (default: 200)')
    })
  )
  .output(
    z.object({
      organizations: z.array(
        z
          .object({
            organizationId: z.string().optional(),
            name: z.string().optional(),
            ssoEnabled: z.boolean().optional(),
            rootOrganizationId: z.string().optional(),
            rootOrganizationName: z.string().optional()
          })
          .passthrough()
      ),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listOrganizations({
      search: ctx.input.search,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let orgs = result?.data ?? (Array.isArray(result) ? result : []);

    return {
      output: {
        organizations: orgs,
        total: result?.total ?? orgs.length
      },
      message: `Found **${orgs.length}** organization(s).`
    };
  })
  .build();
