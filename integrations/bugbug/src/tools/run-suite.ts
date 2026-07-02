import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runSuite = SlateTool.create(spec, {
  name: 'Run Suite',
  key: 'run_suite',
  description: `Execute a test suite in the BugBug cloud. All tests in the suite will run sequentially. Optionally specify a profile and override variables to customize the run environment.`,
  instructions: [
    'The suite will run asynchronously in the cloud. Use the Get Suite Run tool to check progress and results.',
    'Profiles let you run the same suite against different environments or configurations.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      suiteId: z.string().describe('Unique identifier of the suite to run'),
      profileId: z.string().optional().describe('Profile ID to use for the run'),
      overrideVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to override suite variables for this run')
    })
  )
  .output(
    z.object({
      suiteRunId: z.string().describe('Unique identifier of the newly created suite run'),
      status: z.string().describe('Initial status of the suite run')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.runSuite({
      suiteId: ctx.input.suiteId,
      profileId: ctx.input.profileId,
      overrideVariables: ctx.input.overrideVariables
    });

    return {
      output: {
        suiteRunId: result.suiteRunId,
        status: result.status
      },
      message: `Suite run started with ID **${result.suiteRunId}**. Status: **${result.status}**.`
    };
  })
  .build();
