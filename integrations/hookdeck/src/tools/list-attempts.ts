import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let attemptSchema = z.object({
  attemptId: z.string().describe('Attempt ID'),
  teamId: z.string().describe('Team/project ID'),
  eventId: z.string().describe('Event ID the attempt belongs to'),
  status: z.string().describe('Attempt status'),
  responseStatus: z.number().nullable().optional().describe('Destination HTTP status'),
  responseMs: z.number().nullable().optional().describe('Destination response latency'),
  errorCode: z.string().nullable().optional().describe('Hookdeck error code'),
  trigger: z.string().nullable().optional().describe('Attempt trigger'),
  data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Attempt request/response data when returned by Hookdeck'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listAttempts = SlateTool.create(spec, {
  name: 'List Attempts',
  key: 'list_attempts',
  description: `Retrieve and inspect Hookdeck delivery attempts. Attempts are individual delivery tries for an event and include delivery status, destination response details, latency, and error codes useful for debugging.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      attemptId: z.string().optional().describe('Get a specific attempt by ID'),
      eventId: z.string().optional().describe('Filter attempts by event ID'),
      status: z.string().optional().describe('Filter by attempt status'),
      limit: z.number().optional().describe('Max results to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      orderBy: z.string().optional().describe('Field to order by'),
      dir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      attempt: attemptSchema.optional().describe('Single attempt'),
      attempts: z.array(attemptSchema).optional().describe('List of attempts'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapAttempt = (attempt: any) => ({
      attemptId: attempt.id as string,
      teamId: attempt.team_id as string,
      eventId: attempt.event_id as string,
      status: attempt.status as string,
      responseStatus: (attempt.response_status as number | null | undefined) ?? null,
      responseMs: (attempt.response_ms as number | null | undefined) ?? null,
      errorCode: (attempt.error_code as string | null | undefined) ?? null,
      trigger: (attempt.trigger as string | null | undefined) ?? null,
      data: attempt.data as Record<string, unknown> | undefined,
      createdAt: attempt.created_at as string,
      updatedAt: attempt.updated_at as string
    });

    if (ctx.input.attemptId) {
      let attempt = await client.getAttempt(ctx.input.attemptId);
      return {
        output: { attempt: mapAttempt(attempt) },
        message: `Retrieved attempt \`${attempt.id}\` for event \`${attempt.event_id}\`.`
      };
    }

    let result = await client.listAttempts({
      event_id: ctx.input.eventId,
      status: ctx.input.status,
      limit: ctx.input.limit,
      next: ctx.input.cursor,
      order_by: ctx.input.orderBy,
      dir: ctx.input.dir
    });

    return {
      output: {
        attempts: result.models.map(mapAttempt),
        totalCount: result.count,
        nextCursor: result.pagination.next
      },
      message: `Listed **${result.models.length}** attempts (${result.count} total).`
    };
  })
  .build();
