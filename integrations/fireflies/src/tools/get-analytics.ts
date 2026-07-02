import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';

export let getAnalytics = SlateTool.create(spec, {
  name: 'Get Analytics',
  key: 'get_analytics',
  description: `Retrieve team and per-user Fireflies meeting and conversation analytics for an optional date range. Team-level analytics may require admin privileges and a Business or higher plan.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startTime: z.string().optional().describe('Start date/time filter in ISO 8601 format'),
      endTime: z.string().optional().describe('End date/time filter in ISO 8601 format')
    })
  )
  .output(
    z.object({
      analytics: z.any().nullable().describe('Team and user analytics returned by Fireflies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let analytics = await client.getAnalytics({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime
    });

    return {
      output: { analytics: analytics ?? null },
      message: 'Retrieved Fireflies analytics.'
    };
  })
  .build();
