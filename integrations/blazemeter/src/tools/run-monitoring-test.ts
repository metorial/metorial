import { SlateTool } from 'slates';
import { z } from 'zod';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let runMonitoringTest = SlateTool.create(spec, {
  name: 'Run API Monitoring Test',
  key: 'run_monitoring_test',
  description: `Trigger an API monitoring test run and optionally retrieve recent run results. Tests can be run with a specific environment configuration.`,
  instructions: [
    'Provide **bucketKey** and **testId** to trigger a test.',
    'Optionally specify an **environmentId** to use a specific environment.',
    'Use **getResults** to retrieve results of a previous run by its ID.'
  ]
})
  .input(
    z.object({
      bucketKey: z.string().describe('Bucket key containing the test'),
      testId: z.string().describe('Monitoring test ID'),
      environmentId: z.string().optional().describe('Environment ID to use for the test run'),
      getResults: z
        .boolean()
        .optional()
        .describe('If true, get recent results instead of triggering a new run'),
      testRunId: z.string().optional().describe('Specific test run ID to get results for'),
      resultCount: z
        .number()
        .optional()
        .describe('Number of recent results to fetch (default: 10)')
    })
  )
  .output(
    z.object({
      triggered: z.boolean().optional().describe('Whether a new test run was triggered'),
      testRunId: z.string().optional().describe('Triggered test run ID'),
      runs: z
        .array(
          z.object({
            testRunId: z.string().describe('Test run ID'),
            result: z.string().optional().describe('Pass/fail result'),
            createdAt: z.string().optional().describe('When the run started'),
            finishedAt: z.string().optional().describe('When the run finished'),
            region: z.string().optional().describe('Region the test ran from')
          })
        )
        .optional()
        .describe('List of test run results'),
      runDetails: z.any().optional().describe('Detailed results for a specific run')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.runscopeToken && !ctx.auth.token) {
      throw new Error('Runscope OAuth token is required for API Monitoring operations');
    }
    let client = new RunscopeClient({ token: ctx.auth.runscopeToken || ctx.auth.token });

    if (ctx.input.getResults) {
      if (ctx.input.testRunId) {
        let runDetails = await client.getTestRun(
          ctx.input.bucketKey,
          ctx.input.testId,
          ctx.input.testRunId
        );
        return {
          output: { runDetails },
          message: `Retrieved results for run **${ctx.input.testRunId}**.`
        };
      }

      let runs = await client.listTestRuns(
        ctx.input.bucketKey,
        ctx.input.testId,
        ctx.input.resultCount || 10
      );
      let mapped = runs.map((r: any) => ({
        testRunId: r.test_run_id || r.id,
        result: r.result,
        createdAt: r.created_at ? String(r.created_at) : undefined,
        finishedAt: r.finished_at ? String(r.finished_at) : undefined,
        region: r.region
      }));
      return {
        output: { runs: mapped },
        message: `Found **${mapped.length}** run result(s).`
      };
    }

    let result = await client.runTest(
      ctx.input.bucketKey,
      ctx.input.testId,
      ctx.input.environmentId
    );
    return {
      output: {
        triggered: true,
        testRunId: result?.test_run_id || result?.id
      },
      message: `Triggered monitoring test **${ctx.input.testId}** in bucket \`${ctx.input.bucketKey}\`.`
    };
  })
  .build();
