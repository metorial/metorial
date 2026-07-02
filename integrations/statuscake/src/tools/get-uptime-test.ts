import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUptimeTest = SlateTool.create(spec, {
  name: 'Get Uptime Test',
  key: 'get_uptime_test',
  description: `Retrieve detailed information about a specific uptime test by its ID. Returns the full test configuration including test type, URL, check rate, status, regions, contact groups, and all other settings.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the uptime test to retrieve')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('Uptime test details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getUptimeTest(ctx.input.testId);
    let test = result?.data ?? result;

    return {
      output: { test },
      message: `Retrieved uptime test **${test.name ?? ctx.input.testId}**.`
    };
  })
  .build();
