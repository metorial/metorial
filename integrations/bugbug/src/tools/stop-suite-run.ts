import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopSuiteRun = SlateTool.create(spec, {
  name: 'Stop Suite Run',
  key: 'stop_suite_run',
  description: `Stop a currently running suite execution. Use this to cancel a suite run that is in progress.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      suiteRunId: z.string().describe('Unique identifier of the suite run to stop')
    })
  )
  .output(
    z.object({
      suiteRunId: z.string().describe('ID of the stopped suite run'),
      status: z.string().describe('Updated status after stopping')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.stopSuiteRun(ctx.input.suiteRunId);

    return {
      output: {
        suiteRunId: result.suiteRunId,
        status: result.status
      },
      message: `Suite run **${result.suiteRunId}** stopped. Status: **${result.status}**.`
    };
  })
  .build();
