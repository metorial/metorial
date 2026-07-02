import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopTestRun = SlateTool.create(spec, {
  name: 'Stop Test Run',
  key: 'stop_test_run',
  description: `Stop a currently running test execution. Use this to cancel a test that is in progress.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      testRunId: z.string().describe('Unique identifier of the test run to stop')
    })
  )
  .output(
    z.object({
      testRunId: z.string().describe('ID of the stopped test run'),
      status: z.string().describe('Updated status after stopping')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.stopTestRun(ctx.input.testRunId);

    return {
      output: {
        testRunId: result.testRunId,
        status: result.status
      },
      message: `Test run **${result.testRunId}** stopped. Status: **${result.status}**.`
    };
  })
  .build();
