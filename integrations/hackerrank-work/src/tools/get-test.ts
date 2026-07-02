import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTest = SlateTool.create(spec, {
  name: 'Get Test',
  key: 'get_test',
  description: `Retrieve detailed information about a specific coding assessment test, including its configuration, duration, questions, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test to retrieve')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('Test object with full details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTest(ctx.input.testId);

    let test = result.data ?? result;

    return {
      output: {
        test
      },
      message: `Retrieved test **${test.name ?? ctx.input.testId}**.`
    };
  });
