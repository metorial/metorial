import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCandidates = SlateTool.create(spec, {
  name: 'List Candidates',
  key: 'list_candidates',
  description: `List all candidates for a specific test. Returns candidate details including email, status, score, and invitation metadata. Use this to track which candidates have been invited, started, or completed a test.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test to list candidates for'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of candidates to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      candidates: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of candidate objects'),
      total: z.number().describe('Total number of candidates for this test'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listCandidates(ctx.input.testId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        candidates: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** candidates for test **${ctx.input.testId}** (showing ${result.data.length}).`
    };
  });
