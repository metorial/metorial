import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchIncidentHistory = SlateTool.create(spec, {
  name: 'Search Incident History',
  key: 'search_incident_history',
  description: `Search through historical incidents with various filters. Useful for post-incident reviews, reporting, and analyzing incident patterns over time.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      entityId: z.string().optional().describe('Filter by entity ID'),
      incidentNumber: z.string().optional().describe('Filter by specific incident number'),
      startedAfter: z
        .string()
        .optional()
        .describe('Filter incidents started after this ISO8601 timestamp'),
      startedBefore: z
        .string()
        .optional()
        .describe('Filter incidents started before this ISO8601 timestamp'),
      host: z.string().optional().describe('Filter by host'),
      service: z.string().optional().describe('Filter by service'),
      currentPhase: z
        .string()
        .optional()
        .describe(
          'Filter by phase: triggered, acknowledged or resolved; legacy UNACKED, ACKED and RESOLVED are translated; comma-separated values supported'
        ),
      routingKey: z.string().optional().describe('Filter by routing key'),
      offset: z.number().optional().describe('Nonnegative pagination offset'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of results to return; greater than 0, maximum 100')
    })
  )
  .output(
    z.object({
      offset: z.number().int().optional(),
      limit: z.number().int().optional(),
      totalCount: z
        .number()
        .int()
        .optional()
        .describe('Total matches only when supplied by the provider'),
      nextOffset: z.number().int().optional(),
      returnedCount: z.number().int(),
      incidents: z.array(z.any()).describe('List of historical incidents matching the filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let data = await client.searchIncidentHistory({
      entityId: ctx.input.entityId,
      incidentNumber: ctx.input.incidentNumber,
      startedAfter: ctx.input.startedAfter,
      startedBefore: ctx.input.startedBefore,
      host: ctx.input.host,
      service: ctx.input.service,
      currentPhase: ctx.input.currentPhase,
      routingKey: ctx.input.routingKey,
      offset: ctx.input.offset,
      limit: ctx.input.limit
    });

    let incidents = data.incidents;

    return {
      output: {
        incidents,
        offset: data.offset,
        limit: data.limit,
        totalCount: data.total,
        returnedCount: incidents.length,
        nextOffset:
          data.total !== undefined &&
          data.offset !== undefined &&
          data.limit !== undefined &&
          data.limit > 0 &&
          data.offset + data.limit < data.total
            ? data.offset + data.limit
            : undefined
      },
      message: `Found **${incidents.length}** incident(s) matching the search criteria.`
    };
  })
  .build();
