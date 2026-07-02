import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List and search incidents in OpsGenie. Supports filtering by query, pagination, and sorting. Only available on Standard and Enterprise plans.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query for filtering incidents'),
      offset: z.number().optional().describe('Start index for pagination (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of incidents to return (max 100, default 20)'),
      sort: z
        .enum(['createdAt', 'updatedAt', 'status', 'priority'])
        .optional()
        .describe('Field to sort by'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      incidents: z.array(
        z.object({
          incidentId: z.string().describe('Unique incident ID'),
          tinyId: z.string().optional().describe('Short numeric incident ID'),
          message: z.string().describe('Incident message'),
          status: z.string().describe('Incident status'),
          tags: z.array(z.string()).describe('Incident tags'),
          createdAt: z.string().describe('Creation time'),
          updatedAt: z.string().describe('Last update time'),
          priority: z.string().describe('Incident priority')
        })
      ),
      totalCount: z.number().describe('Number of incidents returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listIncidents(ctx.input);
    let data = response.data ?? [];

    let incidents = data.map((i: any) => ({
      incidentId: i.id,
      tinyId: i.tinyId,
      message: i.message,
      status: i.status,
      tags: i.tags ?? [],
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      priority: i.priority
    }));

    return {
      output: {
        incidents,
        totalCount: incidents.length
      },
      message: `Found **${incidents.length}** incidents${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
