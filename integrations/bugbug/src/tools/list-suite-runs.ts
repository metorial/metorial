import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSuiteRuns = SlateTool.create(spec, {
  name: 'List Suite Runs',
  key: 'list_suite_runs',
  description: `List historical suite run results with filtering by date range. Use this to review suite execution history and track test regression trends.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
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
      ordering: z.string().optional().describe('Field to order results by')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of suite runs matching the filters'),
      suiteRuns: z.array(
        z.object({
          suiteRunId: z.string().describe('Unique identifier of the suite run'),
          suiteId: z.string().describe('ID of the suite'),
          suiteName: z.string().describe('Name of the suite'),
          status: z.string().describe('Final or current status'),
          started: z.string().nullable().describe('ISO timestamp when the run started'),
          finished: z.string().nullable().describe('ISO timestamp when the run finished'),
          duration: z.number().nullable().describe('Duration in milliseconds'),
          runProfileName: z.string().nullable().describe('Profile name used'),
          testRunsCount: z.number().describe('Total test runs'),
          passedTestRunsCount: z.number().describe('Passed test runs'),
          failedTestRunsCount: z.number().describe('Failed test runs')
        })
      ),
      hasMore: z.boolean().describe('Whether there are more pages of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSuiteRuns({
      startedAfter: ctx.input.startedAfter,
      startedBefore: ctx.input.startedBefore,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      ordering: ctx.input.ordering
    });

    let suiteRuns = result.results.map(r => ({
      suiteRunId: r.id,
      suiteId: r.suiteId,
      suiteName: r.suiteName,
      status: r.status,
      started: r.started,
      finished: r.finished,
      duration: r.duration,
      runProfileName: r.runProfileName,
      testRunsCount: r.testRunsCount,
      passedTestRunsCount: r.passedTestRunsCount,
      failedTestRunsCount: r.failedTestRunsCount
    }));

    return {
      output: {
        totalCount: result.count,
        suiteRuns,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** suite run(s). Returned ${suiteRuns.length} on this page.`
    };
  })
  .build();
