import { SlateTool } from 'slates';
import { z } from 'zod';
import { amplitudeIdSchema, createAnalyticsClient } from '../lib/analytics-client';
import { amplitudeServiceError } from '../lib/errors';
import { recordSchema } from '../lib/rest-validation';
import { spec } from '../spec';
import { tags, userIdInput } from './project-analytics-schemas';

export const searchUsersTool = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  tags,
  description:
    'Find users by user ID, device ID, Amplitude ID, or user ID prefix and return Amplitude IDs for activity and replay lookup. Empty matches are normal. Uses the connected project API key and secret; no project ID is needed.'
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'User ID, device ID, numeric Amplitude ID as a string, or user ID prefix. This does not search arbitrary user properties.'
        )
    })
  )
  .output(
    z.object({
      matches: z.array(
        z.object({ userId: z.string().nullable(), amplitudeId: amplitudeIdSchema })
      ),
      matchType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createAnalyticsClient(ctx).searchUsers(ctx.input.query);
    return {
      output: {
        matches: result.matches.map(match => ({
          userId: match.user_id ?? null,
          amplitudeId: match.amplitude_id
        })),
        matchType: result.type
      },
      message: `Found ${result.matches.length} matching users.`
    };
  })
  .build();

export const getUserActivityTool = SlateTool.create(spec, {
  name: 'Get User Activity',
  key: 'get_user_activity',
  tags,
  description:
    'Read a user summary and ordered event history using an Amplitude ID from search_users. Choose latest or earliest events and follow nextOffset until an empty page. Requires project API key and secret.',
  constraints: [
    'Amplitude may return more events than limit to preserve complete sessions. nextOffset advances by the actual returnedCount.'
  ]
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      amplitudeId: userIdInput,
      offset: z
        .number()
        .int()
        .nonnegative()
        .max(Number.MAX_SAFE_INTEGER)
        .default(0)
        .describe('Zero-based event offset; use nextOffset from the previous page.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .default(100)
        .describe('Requested event count; complete sessions can make the response larger.'),
      direction: z
        .enum(['latest', 'earliest'])
        .default('latest')
        .describe('Event ordering; keep the same direction across pages.')
    })
  )
  .output(
    z.object({
      amplitudeId: amplitudeIdSchema,
      userData: recordSchema,
      events: z.array(recordSchema),
      returnedCount: z.number(),
      nextOffset: z.number().nullable()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createAnalyticsClient(ctx).getUserActivity(ctx.input);
    const next = ctx.input.offset + result.events.length;
    if (!Number.isSafeInteger(next))
      throw amplitudeServiceError(
        'The next activity offset exceeds the supported safe integer range.'
      );
    return {
      output: {
        amplitudeId: ctx.input.amplitudeId,
        ...result,
        returnedCount: result.events.length,
        nextOffset: result.events.length ? next : null
      },
      message: `Retrieved ${result.events.length} user events.`
    };
  })
  .build();
