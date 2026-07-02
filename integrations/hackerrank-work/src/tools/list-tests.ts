import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTests = SlateTool.create(spec, {
  name: 'List Tests',
  key: 'list_tests',
  description: `List all coding assessment tests in your HackerRank for Work account. Returns test metadata including name, status, duration, and question count. Supports pagination for large test libraries.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of tests to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      tests: z.array(z.record(z.string(), z.any())).describe('Array of test objects'),
      total: z.number().describe('Total number of tests available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTests({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        tests: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** tests (showing ${result.data.length} from offset ${result.offset}).`
    };
  });
