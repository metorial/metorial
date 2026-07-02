import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPagespeedHistory = SlateTool.create(spec, {
  name: 'Get Page Speed History',
  key: 'get_pagespeed_history',
  description: `Retrieve historical performance data for a page speed test. Returns paginated results with load time, file size, and request count metrics. Includes aggregated min/max/avg statistics in metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the page speed test'),
      before: z.string().optional().describe('ISO 8601 date to filter results before'),
      after: z.string().optional().describe('ISO 8601 date to filter results after'),
      limit: z.number().optional().describe('Number of results per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      records: z
        .array(z.record(z.string(), z.any()))
        .describe('List of performance data records'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Aggregated statistics and pagination info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPagespeedTestHistory(ctx.input.testId, {
      before: ctx.input.before,
      after: ctx.input.after,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let records = result?.data ?? [];
    let metadata = result?.metadata ?? undefined;

    return {
      output: { records, metadata },
      message: `Retrieved **${records.length}** history record(s) for page speed test **${ctx.input.testId}**.`
    };
  })
  .build();
