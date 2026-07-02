import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List teams in Rootly. Search by name, slug, or keyword.
Use this to find team IDs for filtering incidents or assigning ownership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search teams by keyword'),
      name: z.string().optional().describe('Filter by team name'),
      slug: z.string().optional().describe('Filter by team slug'),
      sort: z.string().optional().describe('Sort field'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      teams: z.array(z.record(z.string(), z.any())).describe('List of teams'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeams({
      search: ctx.input.search,
      name: ctx.input.name,
      slug: ctx.input.slug,
      sort: ctx.input.sort,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let teams = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        teams,
        totalCount: result.meta?.total_count
      },
      message: `Found **${teams.length}** teams.`
    };
  })
  .build();
