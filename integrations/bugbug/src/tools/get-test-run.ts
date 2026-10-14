import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, durationMilliseconds } from '../lib/client';
import { spec } from '../spec';

export let getTestRun = SlateTool.create(spec, {
  name: 'Get Test Run',
  key: 'get_test_run',
  description: `Retrieve details and results of a specific test run, including its status, timing, and the test it belongs to. Use this to check whether a previously triggered test run has completed and whether it passed or failed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testRunId: z.string().describe('Unique identifier of the test run to retrieve')
    })
  )
  .output(
    z.object({
      testRunId: z.string().describe('Unique identifier of the test run'),
      testId: z.string().nullable().describe('ID of the test that was run'),
      testName: z.string().describe('Name of the test that was run'),
      status: z
        .string()
        .describe('Current status (e.g. passed, failed, running, queued, error, stopped)'),
      started: z.string().nullable().describe('ISO timestamp when the run started'),
      finished: z.string().nullable().describe('ISO timestamp when the run finished'),
      duration: z.number().nullable().describe('Duration of the run in milliseconds'),
      runMode: z.string().nullable().describe('Execution mode (e.g. cloud, local)'),
      runProfileName: z.string().nullable().describe('Name of the profile used for this run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let run = await client.getTestRun(ctx.input.testRunId);

    let duration = durationMilliseconds(run);

    return {
      output: {
        testRunId: run.id,
        testId: run.testId,
        testName: run.name,
        status: run.status,
        started: run.started,
        finished: run.ended,
        duration,
        runMode: run.runMode,
        runProfileName: run.profileName
      },
      message: `Test run for **${run.name}**: status **${run.status}**${duration != null ? `, duration ${duration}ms` : ''}.`
    };
  })
  .build();
