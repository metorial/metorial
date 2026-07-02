import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTracking = SlateTool.create(spec, {
  name: 'Get Learner Tracking',
  key: 'get_tracking',
  description: `Retrieve learner progress tracking data for a specific course. Supports filtering by user identifier, client identifier, date range, and completion status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      courseId: z.number().describe('Course ID to get tracking data for'),
      identifier: z.string().optional().describe('Filter by learner identifier'),
      clientIdentifier: z.string().optional().describe('Filter by client identifier'),
      startDate: z
        .string()
        .optional()
        .describe('Filter trackings created after this date (ISO 8601)'),
      endDate: z
        .string()
        .optional()
        .describe('Filter trackings created before this date (ISO 8601)'),
      completed: z.boolean().optional().describe('Only return completed trackings'),
      page: z.number().optional().describe('Page number for pagination (starts at 0)'),
      length: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      trackings: z.array(z.record(z.string(), z.any())).describe('List of tracking objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.auth.userId,
      authScheme: ctx.auth.authScheme
    });

    let result = await client.listTrackings({
      id: ctx.input.courseId,
      identifier: ctx.input.identifier,
      clientIdentifier: ctx.input.clientIdentifier,
      start: ctx.input.startDate,
      end: ctx.input.endDate,
      completed: ctx.input.completed,
      page: ctx.input.page,
      length: ctx.input.length
    });

    let trackings = Array.isArray(result) ? result : (result?.data ?? [result]);

    return {
      output: { trackings },
      message: `Retrieved ${trackings.length} tracking record(s) for course **${ctx.input.courseId}**.`
    };
  })
  .build();
