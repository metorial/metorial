import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTests = SlateTool.create(spec, {
  name: 'List Tests',
  key: 'list_tests',
  description: `List all tests in the current BugBug project. Supports searching by name, pagination, and sorting. Use this to discover available tests before running them or to check the latest run status of your tests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query to filter tests by name'),
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
      totalCount: z.number().describe('Total number of tests matching the query'),
      tests: z.array(
        z.object({
          testId: z.string().describe('Unique identifier of the test'),
          name: z.string().describe('Name of the test'),
          created: z.string().describe('ISO timestamp when the test was created'),
          lastModified: z.string().describe('ISO timestamp when the test was last modified'),
          lastRunStatus: z
            .string()
            .nullable()
            .describe(
              'Status of the most recent run (e.g. passed, failed, or null if never run)'
            ),
          isFavorite: z.boolean().describe('Whether the test is marked as a favorite')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTests({
      query: ctx.input.query,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      ordering: ctx.input.ordering
    });

    let tests = result.results.map(t => ({
      testId: t.id,
      name: t.name,
      created: t.created,
      lastModified: t.lastModified,
      lastRunStatus: t.lastRunStatus,
      isFavorite: t.isFavorite
    }));

    return {
      output: {
        totalCount: result.count,
        tests,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** test(s). Returned ${tests.length} on this page.`
    };
  })
  .build();
