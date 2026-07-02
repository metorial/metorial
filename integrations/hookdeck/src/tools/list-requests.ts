import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let requestSchema = z.object({
  requestId: z.string().describe('Request ID'),
  teamId: z.string().describe('Team/project ID'),
  sourceId: z.string().describe('Source ID that received the request'),
  status: z.string().optional().describe('Request status'),
  headers: z.record(z.string(), z.string()).describe('Request headers'),
  body: z.unknown().optional().describe('Request body'),
  query: z.string().optional().describe('Raw query string'),
  parsedQuery: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Parsed query parameters'),
  path: z.string().optional().describe('Request path'),
  rejectionCause: z.string().nullable().optional().describe('Rejection reason if rejected'),
  verifiedAt: z
    .string()
    .nullable()
    .optional()
    .describe('Timestamp when verification succeeded'),
  createdAt: z.string().describe('Creation timestamp')
});

export let listRequests = SlateTool.create(spec, {
  name: 'List Requests',
  key: 'list_requests',
  description: `Retrieve and inspect inbound HTTP requests received by Hookdeck sources. Requests are the raw inbound payloads before they are split into events per connection. Filter by source or rejection status.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      requestId: z.string().optional().describe('Get a specific request by ID'),
      sourceId: z.string().optional().describe('Filter by source ID'),
      status: z.enum(['accepted', 'rejected']).optional().describe('Filter by request status'),
      rejectionCause: z.string().optional().describe('Filter by rejection cause'),
      createdAfter: z
        .string()
        .optional()
        .describe('Filter requests created after this ISO timestamp'),
      createdBefore: z
        .string()
        .optional()
        .describe('Filter requests created before this ISO timestamp'),
      limit: z.number().optional().describe('Max results to return'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      request: requestSchema
        .optional()
        .describe('Single request (when requestId is provided)'),
      requests: z.array(requestSchema).optional().describe('List of requests'),
      nextCursor: z.string().optional().describe('Next pagination cursor'),
      totalCount: z.number().optional().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });

    let mapRequest = (r: any) => {
      let data = (r.data ?? {}) as Record<string, any>;
      return {
        requestId: r.id as string,
        teamId: r.team_id as string,
        sourceId: r.source_id as string,
        status: r.status as string | undefined,
        headers: (data.headers || r.headers || {}) as Record<string, string>,
        body: data.body ?? r.body,
        query: (data.query ?? r.query) as string | undefined,
        parsedQuery: (data.parsed_query ?? data.parsedQuery ?? r.parsed_query) as
          | Record<string, unknown>
          | undefined,
        path: (data.path ?? r.path) as string | undefined,
        rejectionCause: (r.rejection_cause as string | null) ?? null,
        verifiedAt: (r.verified_at as string | null) ?? null,
        createdAt: r.created_at as string
      };
    };

    if (ctx.input.requestId) {
      let request = await client.getRequest(ctx.input.requestId);
      return {
        output: { request: mapRequest(request) },
        message: `Retrieved request \`${request.id}\` from source \`${request.source_id}\`.`
      };
    }

    let createdAt: Record<string, string> | undefined;
    if (ctx.input.createdAfter || ctx.input.createdBefore) {
      createdAt = {};
      if (ctx.input.createdAfter) createdAt.gte = ctx.input.createdAfter;
      if (ctx.input.createdBefore) createdAt.lte = ctx.input.createdBefore;
    }

    let result = await client.listRequests({
      source_id: ctx.input.sourceId,
      status: ctx.input.status,
      rejection_cause: ctx.input.rejectionCause,
      created_at: createdAt,
      limit: ctx.input.limit,
      next: ctx.input.cursor
    });

    return {
      output: {
        requests: result.models.map(r => mapRequest(r)),
        totalCount: result.count,
        nextCursor: result.pagination.next
      },
      message: `Listed **${result.models.length}** requests (${result.count} total).`
    };
  })
  .build();
