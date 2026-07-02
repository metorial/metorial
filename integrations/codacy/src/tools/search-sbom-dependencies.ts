import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchSbomDependencies = SlateTool.create(spec, {
  name: 'Search SBOM Dependencies',
  key: 'search_sbom_dependencies',
  description: `Search software bill of materials (SBOM) dependencies across your organization. Find specific dependencies (e.g. "log4j"), filter by vulnerability severity, and identify which repositories use a given dependency.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      searchText: z
        .string()
        .optional()
        .describe('Search text to find specific dependencies (e.g. "log4j", "lodash").'),
      repositories: z.array(z.string()).optional().describe('Filter by repository names.'),
      findingSeverities: z
        .array(z.enum(['Critical', 'High', 'Medium', 'Low']))
        .optional()
        .describe('Filter by vulnerability severity levels.'),
      sortColumn: z
        .enum(['severity', 'ossfScore'])
        .optional()
        .describe('Column to sort results by.'),
      columnOrder: z.enum(['asc', 'desc']).optional().describe('Sort order.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of dependencies to return (1-100).')
    })
  )
  .output(
    z.object({
      dependencies: z
        .array(z.any())
        .describe('List of SBOM dependencies with vulnerability information.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of matching dependencies.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: any = {};
    if (ctx.input.searchText) body.text = ctx.input.searchText;
    if (ctx.input.repositories) body.repositories = ctx.input.repositories;
    if (ctx.input.findingSeverities) body.findingSeverities = ctx.input.findingSeverities;

    let response = await client.searchSbomDependencies(body, {
      sortColumn: ctx.input.sortColumn,
      columnOrder: ctx.input.columnOrder,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let dependencies = response.data ?? [];

    return {
      output: {
        dependencies,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${dependencies.length}** dependenc${dependencies.length === 1 ? 'y' : 'ies'}.${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
