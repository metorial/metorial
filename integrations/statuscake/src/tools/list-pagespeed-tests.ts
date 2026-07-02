import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPagespeedTests = SlateTool.create(spec, {
  name: 'List Page Speed Tests',
  key: 'list_pagespeed_tests',
  description: `List all page speed monitoring checks on your StatusCake account. Returns check configuration including URL, check rate, region, alert thresholds, and latest performance stats.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination'),
      limit: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      tests: z.array(z.record(z.string(), z.any())).describe('List of page speed test objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPagespeedTests({
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let tests = result?.data ?? [];

    return {
      output: { tests },
      message: `Found **${tests.length}** page speed test(s).`
    };
  })
  .build();
