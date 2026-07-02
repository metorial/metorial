import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchTickets = SlateTool.create(spec, {
  name: 'Search Tickets',
  key: 'search_tickets',
  description: `Search tickets using Freshservice's query language. Supports filtering by fields like priority, status, agent, group, created/updated dates, and custom fields.

Example queries:
- \`"priority:3 AND status:2"\` — high-priority open tickets
- \`"agent_id:123 AND status:2"\` — open tickets assigned to agent 123
- \`"tag:'VPN' AND priority:4"\` — urgent tickets tagged VPN
- \`"created_at:>'2024-01-01'"\` — tickets created after Jan 1, 2024`,
  instructions: [
    'Use Freshservice query syntax with field:value pairs joined by AND/OR.',
    'String values must be enclosed in single quotes within the query.',
    'Date values use the format YYYY-MM-DD.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query using Freshservice query language (e.g. "priority:3 AND status:2")'
        ),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tickets: z
        .array(
          z.object({
            ticketId: z.number().describe('ID of the ticket'),
            subject: z.string().describe('Subject'),
            status: z.number().describe('Status'),
            priority: z.number().describe('Priority'),
            type: z.string().nullable().describe('Type'),
            requesterId: z.number().describe('Requester ID'),
            agentId: z.number().nullable().describe('Assigned agent ID'),
            groupId: z.number().nullable().describe('Assigned group ID'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('Matching tickets'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.searchTickets(ctx.input.query, ctx.input.page);

    let tickets = (result.tickets || []).map((t: Record<string, unknown>) => ({
      ticketId: t.id as number,
      subject: t.subject as string,
      status: t.status as number,
      priority: t.priority as number,
      type: t.type as string | null,
      requesterId: t.requester_id as number,
      agentId: t.responder_id as number | null,
      groupId: t.group_id as number | null,
      createdAt: t.created_at as string,
      updatedAt: t.updated_at as string
    }));

    return {
      output: { tickets, total: result.total },
      message: `Found **${tickets.length}** tickets matching query`
    };
  })
  .build();
