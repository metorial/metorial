import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, nextBefore } from '../lib/client';
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
      before: z
        .string()
        .optional()
        .describe('RFC3339 date or UNIX-seconds string to filter results before'),
      after: z
        .string()
        .optional()
        .describe('RFC3339 date or UNIX-seconds string to filter results after'),
      limit: z
        .number()
        .optional()
        .describe('Number of results per response, between 1 and 100'),
      page: z
        .number()
        .optional()
        .describe('Legacy first-page selector; use before/after cursors for continuation')
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
        .describe('Aggregated statistics and pagination info'),
      links: z.record(z.string(), z.any()).optional().describe('Provider continuation links'),
      nextBefore: z
        .string()
        .optional()
        .describe('UNIX-seconds cursor to pass as before for the next response')
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

    let records = result.data;
    let metadata = result.metadata;

    return {
      output: { records, metadata, links: result.links, nextBefore: nextBefore(result.links) },
      message: `Retrieved **${records.length}** history record(s) for page speed test **${ctx.input.testId}**.`
    };
  })
  .build();
