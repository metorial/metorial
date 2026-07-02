import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listOrganizations = SlateTool.create(spec, {
  name: 'List Organizations',
  key: 'list_organizations',
  description: `Retrieve the hierarchical structure of organizations accessible by your account. Returns churches, ministries, and other organizational units. Supports searching by name and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z.string().optional().describe('Filter organizations by name'),
      page: z.number().optional().describe('Page number (default: 1)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 100)')
    })
  )
  .output(
    z.object({
      organizations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of organizations'),
      page: z.number().describe('Current page number'),
      pageSize: z.number().describe('Page size'),
      total: z.number().describe('Total number of organizations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listOrganizations({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      searchText: ctx.input.searchText
    });

    return {
      output: {
        organizations: result.data as Record<string, unknown>[],
        page: result.page,
        pageSize: result.page_size,
        total: result.total
      },
      message: `Found **${result.total}** organization(s). Showing page ${result.page}.`
    };
  })
  .build();
