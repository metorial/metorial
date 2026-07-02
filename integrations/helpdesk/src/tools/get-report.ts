import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getReport = SlateTool.create(spec, {
  name: 'Get Report',
  key: 'get_report',
  description: `Fetch reporting data from HelpDesk. Available report types: new-tickets, ticket-sources, ticket-rating, agent-rating, rating-per-agent, rating-per-team, ticket-status, tickets-status-per-agent, tickets-status-per-team, response-time, response-time-per-agent, response-time-per-team, resolution-time, resolution-time-per-agent, resolution-time-per-team, new-tickets/24h-distribution, ticket-sources/24h-distribution, ticket-rating/24h-distribution, ticket-status/24h-distribution, response-time/24h-distribution, resolution-time/24h-distribution, failed-outgoing-emails, tickets-status-duration, tickets-status-duration-total, tickets-status-duration-per-agent, tickets-status-duration-per-team.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      reportType: z
        .enum([
          'new-tickets',
          'ticket-sources',
          'ticket-rating',
          'agent-rating',
          'rating-per-agent',
          'rating-per-team',
          'ticket-status',
          'tickets-status-per-agent',
          'tickets-status-per-team',
          'response-time',
          'response-time-per-agent',
          'response-time-per-team',
          'resolution-time',
          'resolution-time-per-agent',
          'resolution-time-per-team',
          'new-tickets/24h-distribution',
          'ticket-sources/24h-distribution',
          'ticket-rating/24h-distribution',
          'ticket-status/24h-distribution',
          'response-time/24h-distribution',
          'resolution-time/24h-distribution',
          'failed-outgoing-emails',
          'tickets-status-duration',
          'tickets-status-duration-total',
          'tickets-status-duration-per-agent',
          'tickets-status-duration-per-team'
        ])
        .describe('The type of report to fetch'),
      from: z
        .string()
        .describe('Start date for the report in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)'),
      to: z
        .string()
        .describe('End date for the report in ISO 8601 format (e.g., 2024-01-31T23:59:59Z)'),
      agentIDs: z.array(z.string()).optional().describe('Filter by specific agent IDs'),
      teamIDs: z.array(z.string()).optional().describe('Filter by specific team IDs'),
      tags: z.array(z.string()).optional().describe('Filter by specific tags'),
      priority: z.string().optional().describe('Filter by priority level'),
      includeSpam: z
        .boolean()
        .optional()
        .describe('Whether to include spam tickets in the report')
    })
  )
  .output(
    z.object({
      data: z.any().describe('The raw report data. Shape varies depending on the report type.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getReport(ctx.input.reportType, {
      from: ctx.input.from,
      to: ctx.input.to,
      agentIDs: ctx.input.agentIDs,
      teamIDs: ctx.input.teamIDs,
      tags: ctx.input.tags,
      priority: ctx.input.priority,
      includeSpam: ctx.input.includeSpam
    });

    return {
      output: { data },
      message: `Fetched **${ctx.input.reportType}** report from ${ctx.input.from} to ${ctx.input.to}.`
    };
  })
  .build();
