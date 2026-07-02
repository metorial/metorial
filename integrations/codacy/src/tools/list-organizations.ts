import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `List all Codacy organizations the authenticated user belongs to. Returns organization names, providers, and membership details. Useful for discovering available organizations before performing repository-level operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of organizations to return (1-100).')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(
          z.object({
            organizationName: z.string().describe('Organization name on the Git provider.'),
            provider: z.string().describe('Git provider identifier.'),
            joinStatus: z
              .string()
              .optional()
              .describe('User join status for this organization.')
          })
        )
        .describe('List of organizations.'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for the next page, if available.'),
      total: z.number().optional().describe('Total number of organizations.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listUserOrganizations({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let organizations = (response.data ?? []).map((org: any) => ({
      organizationName: org.name ?? org.remoteOrganizationName ?? '',
      provider: org.provider ?? '',
      joinStatus: org.joinStatus ?? undefined
    }));

    return {
      output: {
        organizations,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${organizations.length}** organization(s).${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
