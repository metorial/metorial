import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in your Elorus organization. Projects can have time entries, tasks, expenses, and invoices linked to them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Free-text search.'),
      ordering: z.string().optional().describe('Sort field. Prefix with "-" for descending.'),
      page: z.number().optional().describe('Page number (starts at 1).'),
      pageSize: z.number().optional().describe('Results per page (max 250).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching projects.'),
      projects: z.array(z.any()).describe('Array of project objects.'),
      hasMore: z.boolean().describe('Whether there are more pages.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let result = await client.listProjects({
      search: ctx.input.search,
      ordering: ctx.input.ordering,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        projects: result.results,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** project(s). Returned ${result.results.length} on this page.`
    };
  })
  .build();
