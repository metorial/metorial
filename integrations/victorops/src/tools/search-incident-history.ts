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
        .describe('Filter by current phase (UNACKED, ACKED, RESOLVED)'),
      routingKey: z.string().optional().describe('Filter by routing key'),
      offset: z.number().optional().describe('Pagination offset'),
      limit: z.number().optional().describe('Maximum number of results to return')
    })
  )
  .output(
    z.object({
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

    let incidents = data?.incidents ?? [];

    return {
      output: { incidents },
      message: `Found **${incidents.length}** incident(s) matching the search criteria.`
    };
  })
  .build();
