import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { interviewOutputSchema, mapScheduledInterview } from '../lib/mappers';
import { spec } from '../spec';
export const listScheduledInterviewsTool = SlateTool.create(spec, {
  key: 'list_scheduled_interviews',
  name: 'List Scheduled Interviews',
  description:
    'List interviews by application or one date range. Returns timing, status and job interview IDs; expanded v1 interviewer data is unavailable.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cursor: z
        .string()
        .optional()
        .describe(
          'Opaque nextCursor from the preceding response. Pass cursor alone for subsequent pages.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Legacy first-page selector. Only page 1 is supported; use cursor for subsequent pages.'
        ),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 500, default 50)'),
      applicationId: z
        .string()
        .optional()
        .describe('Filter interviews for a specific application'),
      createdAfter: z
        .string()
        .optional()
        .describe('Only return interviews created after this ISO 8601 timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Only return interviews created before this ISO 8601 timestamp'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return interviews updated after this ISO 8601 timestamp'),
      updatedBefore: z
        .string()
        .optional()
        .describe('Only return interviews updated before this ISO 8601 timestamp')
    })
  )
  .output(
    z.object({
      interviews: z.array(interviewOutputSchema),
      hasMore: z.boolean(),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const page = await new GreenhouseClient(ctx.auth, ctx.config).listScheduledInterviews(
      ctx.input
    );
    return {
      output: {
        interviews: page.items.map(mapScheduledInterview),
        hasMore: page.hasMore,
        nextCursor: page.nextCursor
      },
      message: `Retrieved ${page.items.length} result(s).`
    };
  })
  .build();
