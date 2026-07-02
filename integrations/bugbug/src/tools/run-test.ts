import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let runTest = SlateTool.create(spec, {
  name: 'Run Test',
  key: 'run_test',
  description: `Execute a test in the BugBug cloud. Optionally specify a profile and override variables to customize the run. Returns the test run ID and initial status which can be used to track progress.`,
  instructions: [
    'The test will run asynchronously in the cloud. Use the Get Test Run tool to check progress and results.',
    'Override variables are key-value pairs that replace default variable values for this run only.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('Unique identifier of the test to run'),
      profileId: z
        .string()
        .optional()
        .describe('Profile ID to use for the run (defines browser, variables, etc.)'),
      overrideVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to override test variables for this run')
    })
  )
  .output(
    z.object({
      testRunId: z.string().describe('Unique identifier of the newly created test run'),
      status: z.string().describe('Initial status of the test run (e.g. queued, running)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.runTest({
      testId: ctx.input.testId,
      profileId: ctx.input.profileId,
      overrideVariables: ctx.input.overrideVariables
    });

    return {
      output: {
        testRunId: result.testRunId,
        status: result.status
      },
      message: `Test run started with ID **${result.testRunId}**. Status: **${result.status}**.`
    };
  })
  .build();
