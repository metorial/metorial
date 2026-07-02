import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSuites = SlateTool.create(spec, {
  name: 'List Suites',
  key: 'list_suites',
  description: `List all test suites in the current BugBug project. Suites group tests together for batch execution. Every project has a default "All tests" suite. Supports searching, pagination, and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter suites by name'),
      page: z.number().optional().describe('Page number for paginated results (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page'),
      ordering: z
        .enum(['-created', '-name', 'created', 'name'])
        .optional()
        .describe('Field to order results by')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of suites matching the query'),
      suites: z.array(
        z.object({
          suiteId: z.string().describe('Unique identifier of the suite'),
          name: z.string().describe('Name of the suite'),
          created: z.string().describe('ISO timestamp when the suite was created'),
          lastModified: z.string().describe('ISO timestamp when the suite was last modified'),
          lastRunStatus: z.string().nullable().describe('Status of the most recent run'),
          testsCount: z.number().describe('Number of tests in the suite')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSuites({
      query: ctx.input.query,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      ordering: ctx.input.ordering
    });

    let suites = result.results.map(s => ({
      suiteId: s.id,
      name: s.name,
      created: s.created,
      lastModified: s.lastModified,
      lastRunStatus: s.lastRunStatus,
      testsCount: s.testsCount
    }));

    return {
      output: {
        totalCount: result.count,
        suites,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** suite(s). Returned ${suites.length} on this page.`
    };
  })
  .build();
