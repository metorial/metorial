import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `Lists all projects in the Northflank account or team. Returns project names, IDs, and descriptions with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      cursor: z.string().optional().describe('Cursor for pagination from a previous response')
    })
  )
  .output(
    z.object({
      projects: z.array(
        z.object({
          projectId: z.string().describe('Unique project identifier'),
          name: z.string().describe('Project name'),
          description: z.string().optional().describe('Project description')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      cursor: z.string().optional().describe('Cursor for fetching the next page'),
      count: z.number().describe('Number of results in this response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let result = await client.listProjects({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cursor: ctx.input.cursor
    });

    let projects = (result.data?.projects || []).map((p: any) => ({
      projectId: p.id,
      name: p.name,
      description: p.description
    }));

    return {
      output: {
        projects,
        hasNextPage: result.pagination.hasNextPage,
        cursor: result.pagination.cursor,
        count: result.pagination.count
      },
      message: `Found **${projects.length}** project(s).${result.pagination.hasNextPage ? ' More results available.' : ''}`
    };
  })
  .build();
