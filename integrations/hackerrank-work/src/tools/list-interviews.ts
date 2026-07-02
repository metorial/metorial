import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listInterviews = SlateTool.create(spec, {
  name: 'List Interviews',
  key: 'list_interviews',
  description: `List all live coding interview sessions. Returns interview details including title, status, interviewers, and scheduling information. Supports pagination for accounts with many interviews.`,
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
        .describe('Number of interviews to return (1-100, default 100)'),
      offset: z.number().min(0).optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      interviews: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of interview objects'),
      total: z.number().describe('Total number of interviews available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listInterviews({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        interviews: result.data,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** interviews (showing ${result.data.length}).`
    };
  });
