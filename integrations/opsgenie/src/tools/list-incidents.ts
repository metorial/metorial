import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { normalizeServiceIds } from '../lib/mappers';
import { getNextNumericOffset } from '../lib/paging';
import { spec } from '../spec';

export let listIncidents = SlateTool.create(spec, {
  name: 'List Incidents',
  key: 'list_incidents',
  description: `List and search incidents in OpsGenie. Supports filtering by query, pagination, and sorting. Only available on Standard and Enterprise plans.`,
  instructions: [
    'Search uses `field: value` pairs, for example `status: open` or `status: open AND priority: P1`.',
    'When nextOffset is returned, pass it as offset to fetch the next page.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query for filtering incidents (e.g., "status: open")'),
      offset: z.number().optional().describe('Start index for pagination (default 0)'),
      limit: z
        .number()
        .optional()
        .describe('Number of incidents to return (max 100, default 20)'),
      sort: z
        .enum([
          'createdAt',
          'updatedAt',
          'status',
          'priority',
          'insertedAt',
          'postmortemStatus',
          'postmortemPublishDueDate'
        ])
        .optional()
        .describe('Field to sort by. Defaults to insertedAt'),
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
          priority: z.string().describe('Incident priority'),
          responders: z
            .array(
              z.object({
                type: z.string().describe('Responder type'),
                id: z.string().optional().describe('Responder ID')
              })
            )
            .optional()
            .describe('Incident responders'),
          impactedServices: z.array(z.string()).optional().describe('IDs of impacted services')
        })
      ),
      totalCount: z.number().describe('Number of incidents returned'),
      hasMore: z.boolean().describe('Whether another page of incidents is available'),
      nextOffset: z
        .number()
        .optional()
        .describe('Offset to pass to fetch the next page, when more incidents are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let response = await client.listIncidents(ctx.input);
    let data = response.data ?? [];
    let nextOffset = getNextNumericOffset(response.paging);

    let incidents = data.map((i: any) => ({
      incidentId: i.id,
      tinyId: i.tinyId,
      message: i.message,
      status: i.status,
      tags: i.tags ?? [],
      createdAt: i.createdAt,
      updatedAt: i.updatedAt,
      priority: i.priority,
      responders: i.responders,
      impactedServices: normalizeServiceIds(i.impactedServices)
    }));

    return {
      output: {
        incidents,
        totalCount: incidents.length,
        hasMore: nextOffset !== undefined,
        nextOffset
      },
      message: `Found **${incidents.length}** incidents${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}.`
    };
  })
  .build();
