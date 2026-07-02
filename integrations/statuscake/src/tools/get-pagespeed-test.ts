import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPagespeedTest = SlateTool.create(spec, {
  name: 'Get Page Speed Test',
  key: 'get_pagespeed_test',
  description: `Retrieve detailed information about a specific page speed test. Returns full configuration, latest performance stats (load time, file size, requests), and alert threshold settings.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the page speed test to retrieve')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('Page speed test details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getPagespeedTest(ctx.input.testId);
    let test = result?.data ?? result;

    return {
      output: { test },
      message: `Retrieved page speed test **${test.name ?? ctx.input.testId}**.`
    };
  })
  .build();
