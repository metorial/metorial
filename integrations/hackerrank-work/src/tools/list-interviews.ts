import { createApiServiceError, SlateTool } from 'slates';
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
      createdAt: z.string().optional().describe('Creation timestamp range as from..to'),
      updatedAt: z.string().optional().describe('Update timestamp range as from..to'),
      endedAt: z.string().optional().describe('End timestamp range as from..to'),
      userId: z
        .string()
        .optional()
        .describe('Creator user ID; call list_users to discover IDs'),
      interviewerId: z
        .string()
        .optional()
        .describe('Interviewer user ID; call list_users to discover IDs'),
      access: z.enum(['owned', 'shared']).optional().describe('Filter by access'),
      currentStatus: z
        .number()
        .optional()
        .describe('Interview status: 0 new, 1 active, 2 ended, 3 paused'),
      orderBy: z
        .enum(['title', 'id', 'created_at', 'ended_at', 'current_status', 'user'])
        .optional()
        .describe('Sort field'),
      orderDirection: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort direction; required with orderBy'),
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
      next: z
        .string()
        .optional()
        .describe('Provider URL for the next page, empty when no next page exists'),
      previous: z.string().optional().describe('Provider URL for the previous page'),
      raw: z
        .record(z.string(), z.any())
        .optional()
        .describe('Complete provider response including pagination'),
      total: z.number().describe('Total number of interviews available'),
      offset: z.number().describe('Current pagination offset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if ((ctx.input.orderBy === undefined) !== (ctx.input.orderDirection === undefined))
      throw createApiServiceError('Provide orderBy and orderDirection together.');
    if (
      ctx.input.currentStatus !== undefined &&
      ![0, 1, 2, 3].includes(ctx.input.currentStatus)
    )
      throw createApiServiceError('currentStatus must be 0, 1, 2, or 3.');
    let result = await client.listInterviews({
      created_at: ctx.input.createdAt,
      updated_at: ctx.input.updatedAt,
      ended_at: ctx.input.endedAt,
      user: ctx.input.userId,
      interviewers: ctx.input.interviewerId,
      access: ctx.input.access,
      current_status: ctx.input.currentStatus,
      order_by: ctx.input.orderBy,
      order_dir: ctx.input.orderDirection,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        interviews: result.data,
        next: result.next,
        previous: result.previous,
        raw: result.raw,
        total: result.total,
        offset: result.offset
      },
      message: `Found **${result.total}** interviews (showing ${result.data.length}).`
    };
  });
