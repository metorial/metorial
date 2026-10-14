import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, durationMilliseconds } from '../lib/client';
import { spec } from '../spec';

export let getSuiteRun = SlateTool.create(spec, {
  name: 'Get Suite Run',
  key: 'get_suite_run',
  description: `Retrieve details and results of a specific suite run, including pass/fail counts and timing. Use this to check whether a previously triggered suite run has completed and review its results.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      suiteRunId: z.string().describe('Unique identifier of the suite run to retrieve')
    })
  )
  .output(
    z.object({
      suiteRunId: z.string().describe('Unique identifier of the suite run'),
      suiteId: z.string().nullable().describe('ID of the suite that was run'),
      suiteName: z.string().describe('Name of the suite that was run'),
      status: z.string().describe('Current status (e.g. passed, failed, running, queued)'),
      started: z.string().nullable().describe('ISO timestamp when the run started'),
      finished: z.string().nullable().describe('ISO timestamp when the run finished'),
      duration: z.number().nullable().describe('Duration of the run in milliseconds'),
      runProfileName: z.string().nullable().describe('Name of the profile used for this run'),
      testRunsCount: z.number().describe('Total number of test runs in this suite run'),
      passedTestRunsCount: z.number().describe('Number of test runs that passed'),
      failedTestRunsCount: z.number().describe('Number of test runs that failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let run = await client.getSuiteRun(ctx.input.suiteRunId);

    return {
      output: {
        suiteRunId: run.id,
        suiteId: run.suiteId,
        suiteName: run.name,
        status: run.status,
        started: run.started,
        finished: run.ended,
        duration: durationMilliseconds(run),
        runProfileName: run.profileName,
        testRunsCount: run.testRuns.length,
        passedTestRunsCount: run.testRuns.filter(test => test.status === 'passed').length,
        failedTestRunsCount: run.testRuns.filter(test => test.status === 'failed').length
      },
      message: `Suite run for **${run.name}**: status **${run.status}**. ${run.testRuns.filter(test => test.status === 'passed').length}/${run.testRuns.length} passed, ${run.testRuns.filter(test => test.status === 'failed').length} failed.`
    };
  })
  .build();
