import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `Search and list incidents in Rootly. Filter by status, severity, services, or teams. Supports pagination and sorting.
Use this to find active incidents, review past incidents, or audit incident history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search incidents by text'),
      kind: z.string().optional().describe('Filter by incident kind, such as normal or test'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status: in_triage, started, detected, acknowledged, mitigated, resolved, closed, cancelled'
        ),
      severity: z.string().optional().describe('Filter by severity slug'),
      serviceIds: z.string().optional().describe('Comma-separated service IDs to filter by'),
      teamIds: z.string().optional().describe('Comma-separated team IDs to filter by'),
      sort: z
        .string()
        .optional()
        .describe(
          'Sort field, e.g. "-created_at" for newest first, "created_at" for oldest first'
        ),
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      returnedCount: z.number().describe('Number of records returned in this response'),
      currentPage: z.number().optional().describe('Provider page number, when supplied'),
      totalPages: z.number().optional().describe('Provider page count, when supplied'),
      nextCursor: z
        .string()
        .optional()
        .describe('Provider continuation cursor, when supplied'),
      included: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Requested related resources'),
      incidents: z.array(z.record(z.string(), z.any())).describe('List of incidents'),
      totalCount: z.number().optional().describe('Total number of matching incidents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listIncidents({
      search: ctx.input.search,
      kind: ctx.input.kind,
      status: ctx.input.status,
      severity: ctx.input.severity,
      serviceIds: ctx.input.serviceIds,
      teamIds: ctx.input.teamIds,
      sort: ctx.input.sort || '-created_at',
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let incidents = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        returnedCount: incidents.length,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages,
        nextCursor: result.meta?.next_cursor,
        included: result.included ? flattenResources(result.included) : undefined,
        incidents,
        totalCount: result.meta?.total_count
      },
      message: `Found **${incidents.length}** incidents${result.meta?.total_count ? ` (${result.meta.total_count} total)` : ''}.`
    };
  })
  .build();
