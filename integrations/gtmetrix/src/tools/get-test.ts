import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { testOutputSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTest = SlateTool.create(spec, {
  name: 'Get Test',
  key: 'get_test',
  description:
    'Checks the current state of a GTmetrix test without waiting for completion. Returns the report ID when completed, or the failure details when the test failed.',
  constraints: [
    'Tests are retained for 24 hours. Poll no more frequently than every 3 seconds.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      testId: z.string().min(1).describe('Test ID from run_test, retest, or list_tests')
    })
  )
  .output(testOutputSchema)
  .handleInvocation(async ctx => {
    let test = await new Client({ token: ctx.auth.token }).getTest(ctx.input.testId);
    return {
      output: test,
      message: `Test **${test.testId}** is **${test.state}**.${test.reportId ? ` Report: **${test.reportId}**.` : ''}${test.error ? ` ${test.error}` : ''}`
    };
  })
  .build();
