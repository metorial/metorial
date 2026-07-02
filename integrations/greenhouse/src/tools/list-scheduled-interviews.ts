import { SlateTool } from 'slates';
import { z } from 'zod';
import { GreenhouseClient } from '../lib/client';
import { mapScheduledInterview } from '../lib/mappers';
import { spec } from '../spec';

export let listScheduledInterviewsTool = SlateTool.create(spec, {
  name: 'List Scheduled Interviews',
  key: 'list_scheduled_interviews',
  description: `List scheduled interviews in Greenhouse. Filter by application or date ranges. Returns interview details including time, location, interviewers, and scorecard status.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
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
      interviews: z.array(
        z.object({
          interviewId: z.string(),
          applicationId: z.string(),
          externalEventId: z.string().nullable(),
          startAt: z.string().nullable(),
          endAt: z.string().nullable(),
          location: z.string().nullable(),
          status: z.string().nullable(),
          interviewName: z.string().nullable(),
          interviewers: z.array(
            z.object({
              userId: z.string(),
              name: z.string(),
              email: z.string().nullable(),
              scorecardId: z.string().nullable()
            })
          ),
          organizer: z.object({ userId: z.string(), name: z.string() }).nullable(),
          createdAt: z.string().nullable(),
          updatedAt: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GreenhouseClient({
      token: ctx.auth.token,
      onBehalfOf: ctx.config.onBehalfOf
    });
    let perPage = ctx.input.perPage || 50;

    let results = await client.listScheduledInterviews({
      page: ctx.input.page,
      perPage,
      applicationId: ctx.input.applicationId
        ? Number.parseInt(ctx.input.applicationId, 10)
        : undefined,
      createdAfter: ctx.input.createdAfter,
      createdBefore: ctx.input.createdBefore,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore
    });

    let interviews = results.map(mapScheduledInterview);

    return {
      output: {
        interviews,
        hasMore: results.length >= perPage
      },
      message: `Found ${interviews.length} scheduled interview(s)${ctx.input.applicationId ? ` for application ${ctx.input.applicationId}` : ''}.`
    };
  })
  .build();
