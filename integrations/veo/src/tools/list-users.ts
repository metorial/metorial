import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Search and retrieve a paginated list of users in your VEO organisation. Filter by name, email, or organisation.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z.string().optional().describe('Search by first name, last name, or email'),
      organisationId: z.string().optional().describe('Filter by organisation ID'),
      pageSize: z.number().optional().default(20).describe('Number of users per page'),
      pageNumber: z
        .number()
        .optional()
        .default(1)
        .describe('Page number to retrieve (1-based)'),
      orderByDirection: z
        .enum(['ASC', 'DESC'])
        .optional()
        .default('ASC')
        .describe('Sort direction')
    })
  )
  .output(
    z.object({
      items: z.array(z.record(z.string(), z.any())).describe('List of user objects'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      totalItemCount: z.number().describe('Total number of users matching the query')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, environment: ctx.auth.environment });

    let result = await client.listUsers({
      searchTerm: ctx.input.searchTerm,
      organisationId: ctx.input.organisationId,
      pageSize: ctx.input.pageSize,
      pageNumber: ctx.input.pageNumber,
      orderByDirection: ctx.input.orderByDirection
    });

    let items = result.Items ?? result.items ?? [];
    let totalItemCount = result.TotalItemCount ?? result.totalItemCount ?? 0;
    let page = result.Page ?? result.page ?? ctx.input.pageNumber;
    let pageSize = result.PageSize ?? result.pageSize ?? ctx.input.pageSize;

    return {
      output: { items, page, pageSize, totalItemCount },
      message: `Retrieved **${items.length}** users (page ${page}, ${totalItemCount} total).`
    };
  })
  .build();
