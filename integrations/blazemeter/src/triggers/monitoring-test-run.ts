import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { RunscopeClient } from '../lib/runscope-client';
import { spec } from '../spec';

export let monitoringTestRun = SlateTrigger.create(spec, {
  name: 'API Monitoring Test Run',
  key: 'monitoring_test_run',
  description:
    'Triggers when an API monitoring test completes a run. Polls for new test run results across buckets.'
})
  .input(
    z.object({
      testRunId: z.string().describe('Test run ID'),
      testId: z.string().describe('Monitoring test ID'),
      testName: z.string().optional().describe('Test name'),
      bucketKey: z.string().describe('Bucket key'),
      result: z.string().optional().describe('Pass/fail result'),
      createdAt: z.string().optional().describe('When the run was created'),
      finishedAt: z.string().optional().describe('When the run finished'),
      region: z.string().optional().describe('Region the test ran from')
    })
  )
  .output(
    z.object({
      testRunId: z.string().describe('Test run ID'),
      testId: z.string().describe('Monitoring test ID'),
      testName: z.string().optional().describe('Test name'),
      bucketKey: z.string().describe('Bucket key'),
      result: z.string().optional().describe('Pass or fail'),
      createdAt: z.string().optional().describe('When the run was created'),
      finishedAt: z.string().optional().describe('When the run finished'),
      region: z.string().optional().describe('Run region'),
      passed: z.boolean().describe('Whether the test passed')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      if (!ctx.auth.runscopeToken && !ctx.auth.token) {
        return { inputs: [] };
      }

      let client = new RunscopeClient({ token: ctx.auth.runscopeToken || ctx.auth.token });
      let state = ctx.state as { lastRunIds?: Record<string, string[]> } | null;
      let lastRunIds = state?.lastRunIds || {};

      let buckets: any[];
      try {
        buckets = await client.listBuckets();
      } catch {
        return { inputs: [], updatedState: { lastRunIds } };
      }

      let allInputs: Array<{
        testRunId: string;
        testId: string;
        testName?: string;
        bucketKey: string;
        result?: string;
        createdAt?: string;
        finishedAt?: string;
        region?: string;
      }> = [];

      let updatedRunIds: Record<string, string[]> = { ...lastRunIds };

      for (let bucket of buckets) {
        try {
          let tests = await client.listTests(bucket.key);

          for (let test of tests) {
            let runs = await client.listTestRuns(bucket.key, test.id, 5);
            let previousIds = lastRunIds[`${bucket.key}:${test.id}`] || [];

            for (let run of runs) {
              let runId = run.test_run_id || run.id;
              if (!previousIds.includes(runId)) {
                allInputs.push({
                  testRunId: runId,
                  testId: test.id,
                  testName: test.name,
                  bucketKey: bucket.key,
                  result: run.result,
                  createdAt: run.created_at ? String(run.created_at) : undefined,
                  finishedAt: run.finished_at ? String(run.finished_at) : undefined,
                  region: run.region
                });
              }
            }

            updatedRunIds[`${bucket.key}:${test.id}`] = runs
              .map((r: any) => r.test_run_id || r.id)
              .filter(Boolean);
          }
        } catch {
          // Skip buckets we can't access
        }
      }

      return {
        inputs: allInputs,
        updatedState: { lastRunIds: updatedRunIds }
      };
    },

    handleEvent: async ctx => {
      let passed = ctx.input.result === 'pass';
      let eventType = passed ? 'monitoring_run.passed' : 'monitoring_run.failed';

      return {
        type: eventType,
        id: `${ctx.input.bucketKey}-${ctx.input.testId}-${ctx.input.testRunId}`,
        output: {
          testRunId: ctx.input.testRunId,
          testId: ctx.input.testId,
          testName: ctx.input.testName,
          bucketKey: ctx.input.bucketKey,
          result: ctx.input.result,
          createdAt: ctx.input.createdAt,
          finishedAt: ctx.input.finishedAt,
          region: ctx.input.region,
          passed
        }
      };
    }
  })
  .build();
