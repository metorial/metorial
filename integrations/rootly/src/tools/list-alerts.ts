import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listAlerts = SlateTool.create(spec, {
  name: 'List Alerts',
  key: 'list_alerts',
  description: `Search and list alerts from monitoring and observability tools. Filter by status, source, services, or environments.
Use this to review incoming alerts, find unacknowledged alerts, or audit alert history.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search alerts by text'),
      status: z
        .string()
        .optional()
        .describe('Filter by status: open, triggered, acknowledged, resolved, deferred'),
      source: z
        .string()
        .optional()
        .describe('Filter by alert source (e.g., datadog, pagerduty, slack)'),
      services: z.string().optional().describe('Filter by services'),
      environments: z.string().optional().describe('Filter by environments'),
      sort: z.string().optional().describe('Sort field, e.g. "-created_at" for newest first'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      alerts: z.array(z.record(z.string(), z.any())).describe('List of alerts'),
      totalCount: z.number().optional().describe('Total number of matching alerts'),
      currentPage: z.number().optional().describe('Current page number'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAlerts({
      search: ctx.input.search,
      status: ctx.input.status,
      source: ctx.input.source,
      services: ctx.input.services,
      environments: ctx.input.environments,
      sort: ctx.input.sort || '-created_at',
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let alerts = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        alerts,
        totalCount: result.meta?.total_count,
        currentPage: result.meta?.current_page,
        totalPages: result.meta?.total_pages
      },
      message: `Found **${alerts.length}** alerts${result.meta?.total_count ? ` (${result.meta.total_count} total)` : ''}.`
    };
  })
  .build();
