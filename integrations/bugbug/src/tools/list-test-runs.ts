import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTestRuns = SlateTool.create(spec, {
  name: 'List Test Runs',
  key: 'list_test_runs',
  description: `List historical test run results with filtering by test, status, and date range. Use this to review test execution history and identify failing tests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.string().optional().describe('Filter runs by a specific test ID'),
      status: z
        .enum([
          'passed',
          'failed',
          'running',
          'queued',
          'error',
          'stopped',
          'initialized',
          'auto_retrying',
          'paused',
          'recording',
          'skipped'
        ])
        .optional()
        .describe('Filter runs by status'),
      startedAfter: z
        .string()
        .optional()
        .describe('Only include runs started after this ISO datetime'),
      startedBefore: z
        .string()
        .optional()
        .describe('Only include runs started before this ISO datetime'),
      page: z.number().optional().describe('Page number for paginated results'),
      pageSize: z.number().optional().describe('Number of results per page'),
      ordering: z.enum(['-started', 'started']).optional().describe('Sort order by start time')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of test runs matching the filters'),
      testRuns: z.array(
        z.object({
          testRunId: z.string().describe('Unique identifier of the test run'),
          testId: z.string().describe('ID of the test that was run'),
          testName: z.string().describe('Name of the test that was run'),
          status: z.string().describe('Final or current status of the run'),
          started: z.string().nullable().describe('ISO timestamp when the run started'),
          finished: z.string().nullable().describe('ISO timestamp when the run finished'),
          duration: z.number().nullable().describe('Duration in milliseconds'),
          runMode: z.string().nullable().describe('Execution mode'),
          runProfileName: z.string().nullable().describe('Profile name used')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTestRuns({
      testId: ctx.input.testId,
      status: ctx.input.status,
      startedAfter: ctx.input.startedAfter,
      startedBefore: ctx.input.startedBefore,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      ordering: ctx.input.ordering
    });

    let testRuns = result.results.map(r => ({
      testRunId: r.id,
      testId: r.testId,
      testName: r.testName,
      status: r.status,
      started: r.started,
      finished: r.finished,
      duration: r.duration,
      runMode: r.runMode,
      runProfileName: r.runProfileName
    }));

    return {
      output: {
        totalCount: result.count,
        testRuns,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** test run(s). Returned ${testRuns.length} on this page.`
    };
  })
  .build();
