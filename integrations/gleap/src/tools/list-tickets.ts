import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Query and retrieve support tickets from Gleap. Filter tickets by type, status, priority, and other properties. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .string()
        .optional()
        .describe('Filter by ticket type (e.g. BUG, FEATURE_REQUEST)'),
      status: z.string().optional().describe('Filter by status (e.g. OPEN, DONE)'),
      priority: z
        .enum(['LOW', 'MEDIUM', 'HIGH'])
        .optional()
        .describe('Filter by priority level'),
      sort: z
        .string()
        .optional()
        .describe('Sort field, prefix with - for descending (e.g. -createdAt, priority)'),
      limit: z.number().optional().describe('Maximum number of tickets to return'),
      skip: z.number().optional().describe('Number of tickets to skip for pagination'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      isSpam: z.boolean().optional().describe('Filter spam tickets')
    })
  )
  .output(
    z.object({
      tickets: z.array(z.record(z.string(), z.any())).describe('List of ticket objects'),
      count: z.number().describe('Number of tickets returned'),
      totalCount: z.number().describe('Total number of matching tickets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let result = await client.listTickets({
      type: ctx.input.type,
      status: ctx.input.status,
      priority: ctx.input.priority,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      skip: ctx.input.skip,
      archived: ctx.input.archived,
      isSpam: ctx.input.isSpam
    });

    return {
      output: {
        tickets: result.tickets || [],
        count: result.count || 0,
        totalCount: result.totalCount || 0
      },
      message: `Found **${result.totalCount || 0}** tickets, returned **${result.count || 0}**.`
    };
  })
  .build();
