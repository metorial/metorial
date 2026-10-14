import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ticketSchema } from '../lib/types';
import { spec } from '../spec';

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `Retrieve support tickets with flexible filtering. Filter by archive status, spam, trash, assignment, starred status, label, and date range. Results are paginated and ordered by last activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z
        .number()
        .optional()
        .describe('Number of tickets per page (1 to 99, default 15)'),
      page: z.number().optional().describe('Page number (default 1)'),
      archived: z
        .union([z.boolean(), z.literal('any')])
        .optional()
        .describe(
          'Filter by archived status. true = only archived, false = exclude archived, "any" = include all'
        ),
      spam: z.boolean().optional().describe('Include spam tickets'),
      trash: z.boolean().optional().describe('Include trashed tickets'),
      replies: z
        .boolean()
        .optional()
        .describe('true returns tickets with replies; false returns tickets without replies'),
      maxReplies: z
        .number()
        .optional()
        .describe('Reply count filter. Cannot be combined with replies=false.'),
      assignedUserId: z
        .string()
        .optional()
        .describe('User ID from list_agents, or me, any, or none'),
      assignedTeamId: z
        .string()
        .optional()
        .describe('Team ID from list_agents, or mine or none'),
      starred: z.boolean().optional().describe('Filter by starred status'),
      label: z.string().optional().describe('Filter by label name'),
      since: z
        .string()
        .optional()
        .describe(
          'Return tickets with activity after this UTC date; uses creation time when sortBy=creation_time'
        ),
      until: z
        .string()
        .optional()
        .describe(
          'Return tickets with activity before this UTC date; uses creation time when sortBy=creation_time'
        ),
      sortBy: z
        .enum(['last_activity', 'creation_time'])
        .optional()
        .describe('Timestamp used for ordering and date filters'),
      requesterEmails: z
        .array(z.string())
        .optional()
        .describe('Filter by one or more requester email addresses')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('List of tickets matching the filters'),
      total: z.number().describe('Total number of matching tickets'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let result = await client.listTickets({
      perPage: ctx.input.perPage,
      page: ctx.input.page,
      archived: ctx.input.archived,
      spam: ctx.input.spam,
      trash: ctx.input.trash,
      replies: ctx.input.replies,
      maxReplies: ctx.input.maxReplies,
      assignedUser: ctx.input.assignedUserId,
      assignedTeam: ctx.input.assignedTeamId,
      starred: ctx.input.starred,
      label: ctx.input.label,
      since: ctx.input.since,
      until: ctx.input.until,
      sortBy: ctx.input.sortBy,
      requesterEmails: ctx.input.requesterEmails
    });

    return {
      output: result,
      message: `Found **${result.total}** tickets (page ${result.currentPage}/${result.totalPages}). Returned **${result.tickets.length}** tickets.`
    };
  })
  .build();
