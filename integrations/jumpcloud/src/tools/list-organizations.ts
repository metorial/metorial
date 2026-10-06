import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { orgIdInput, upstream } from '../lib/validation';
import { spec } from '../spec';
export const listOrganizations = SlateTool.create(spec, {
  key: 'list_organizations',
  name: 'List Organizations',
  description:
    'Discover organizations returned for this credential. A fixed organization connection returns its exact organization summary. This does not identify a current human or grant additional MSP authority.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      orgId: orgIdInput,
      limit: z.number().min(1).max(100).optional().describe('Page size, default 100.'),
      skip: z
        .number()
        .min(0)
        .optional()
        .describe('Number of entries to skip; use the same credential and filters.'),
      filter: z
        .string()
        .optional()
        .describe('Native filter expression for organization discovery.'),
      sort: z.string().optional().describe('Native sort expression.')
    })
  )
  .output(
    z.object({
      organizations: z.array(z.object({ organizationId: z.string(), name: z.string() })),
      totalCount: z.number(),
      fixedOrganization: z
        .boolean()
        .describe(
          'Whether the result is constrained to the connection-selected organization rather than a discovery page.'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    try {
      const fixed = client.options.orgId;
      if (fixed) {
        if (
          ctx.input.filter !== undefined ||
          ctx.input.sort !== undefined ||
          ctx.input.skip !== undefined ||
          ctx.input.limit !== undefined
        )
          throw createApiServiceError(
            'Omit paging and filters for an exact selected organization, or use an unbound authorized discovery connection.'
          );
        const row = await client.getOrganization(fixed);
        return {
          output: {
            organizations: [{ organizationId: row._id, name: row.displayName }],
            totalCount: 1,
            fixedOrganization: true
          },
          message: 'Returned the exact authorized organization summary.'
        };
      }
      const page = await client.listOrganizations(ctx.input);
      return {
        output: {
          organizations: page.results.map(row => ({
            organizationId: row._id,
            name: row.displayName
          })),
          totalCount: page.totalCount,
          fixedOrganization: false
        },
        message: `Returned ${page.results.length} authorized organization summaries from a native total of ${page.totalCount}.`
      };
    } catch (error) {
      throw upstream(error);
    }
  })
  .build();
