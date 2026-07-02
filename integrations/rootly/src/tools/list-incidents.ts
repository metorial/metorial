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
      pageSize: z.number().optional().describe('Number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      incidents: z.array(z.record(z.string(), z.any())).describe('List of incidents'),
      totalCount: z.number().optional().describe('Total number of matching incidents'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listIncidents({
      search: ctx.input.search,
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
        incidents,
        totalCount: result.meta?.total_count,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages
      },
      message: `Found **${incidents.length}** incidents${result.meta?.total_count ? ` (${result.meta.total_count} total)` : ''}.`
    };
  })
  .build();
