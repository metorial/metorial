import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSslTest = SlateTool.create(spec, {
  name: 'Get SSL Test',
  key: 'get_ssl_test',
  description: `Retrieve detailed information about a specific SSL certificate check. Returns certificate scoring, cipher details, issuer information, validity dates, mixed content resources found, and all alert configuration.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the SSL test to retrieve')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('SSL test details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getSslTest(ctx.input.testId);
    let test = result?.data ?? result;

    return {
      output: { test },
      message: `Retrieved SSL test for **${test.website_url ?? ctx.input.testId}**.`
    };
  })
  .build();
