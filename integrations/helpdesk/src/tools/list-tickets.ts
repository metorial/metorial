import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  id: z.string().describe('Unique ticket ID'),
  shortID: z.string().describe('Short human-readable ticket ID'),
  status: z
    .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
    .describe('Current ticket status'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).describe('Ticket priority level'),
  subject: z.string().describe('Ticket subject line'),
  requester: z
    .object({
      email: z.string().describe('Requester email address'),
      name: z.string().optional().describe('Requester display name')
    })
    .describe('Ticket requester information'),
  teamID: z.string().describe('ID of the team assigned to this ticket'),
  assigneeID: z.string().optional().describe('ID of the agent assigned to this ticket'),
  tags: z.array(z.string()).describe('Tags applied to this ticket'),
  followers: z.array(z.string()).describe('Agent IDs following this ticket'),
  ccRecipients: z.array(z.string()).optional().describe('CC recipient email addresses'),
  customFields: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom field values keyed by field ID'),
  parentTicketID: z
    .string()
    .optional()
    .describe('ID of the parent ticket if this ticket was merged'),
  childTicketIDs: z
    .array(z.string())
    .optional()
    .describe('IDs of child tickets merged into this ticket'),
  createdAt: z.string().describe('ISO 8601 timestamp when the ticket was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the ticket was last updated'),
  lastMessageAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp of the last message on this ticket'),
  rating: z
    .object({
      score: z.enum(['good', 'neutral', 'bad']).describe('Customer satisfaction rating score'),
      comment: z.string().optional().describe('Customer comment on the rating'),
      ratedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the rating was submitted')
    })
    .optional()
    .describe('Customer satisfaction rating'),
  language: z.string().optional().describe('Detected language of the ticket'),
  spam: z.boolean().optional().describe('Whether this ticket is marked as spam'),
  silo: z
    .enum(['tickets', 'archive', 'spam', 'trash'])
    .optional()
    .describe('Which silo this ticket belongs to')
});

export let listTickets = SlateTool.create(spec, {
  name: 'List Tickets',
  key: 'list_tickets',
  description: `List and search HelpDesk tickets with filtering, sorting, and pagination. Use filters to narrow results by status, team, assignee, tags, requester email, date ranges, or free-text search. Supports cursor-based pagination for large result sets.`,
  instructions: [
    'Use the search parameter for free-text search across ticket subjects and messages.',
    'Date filters (createdFrom, createdTo, updatedFrom, updatedTo) accept ISO 8601 date strings.',
    'Use cursor for pagination; it corresponds to the "after" value from a previous response.',
    'The silo parameter filters by ticket location: tickets (default inbox), archive, spam, or trash.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
        .optional()
        .describe('Filter by ticket status'),
      teamID: z.string().optional().describe('Filter by team ID'),
      assigneeID: z.string().optional().describe('Filter by assigned agent ID'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Filter by tags (tickets must have all specified tags)'),
      requesterEmail: z.string().optional().describe('Filter by requester email address'),
      createdFrom: z
        .string()
        .optional()
        .describe('Filter tickets created on or after this ISO 8601 date'),
      createdTo: z
        .string()
        .optional()
        .describe('Filter tickets created on or before this ISO 8601 date'),
      updatedFrom: z
        .string()
        .optional()
        .describe('Filter tickets updated on or after this ISO 8601 date'),
      updatedTo: z
        .string()
        .optional()
        .describe('Filter tickets updated on or before this ISO 8601 date'),
      search: z
        .string()
        .optional()
        .describe('Free-text search query across ticket subjects and messages'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by, e.g. "createdAt", "updatedAt", "priority"'),
      sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe('Sort order: ascending or descending'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor from a previous response to fetch the next page'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of tickets to return per page (1-100)'),
      silo: z
        .enum(['tickets', 'archive', 'spam', 'trash'])
        .optional()
        .describe('Filter by ticket silo/location')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('Array of tickets matching the query'),
      pagination: z
        .object({
          after: z.string().optional().describe('Cursor to fetch the next page of results'),
          before: z
            .string()
            .optional()
            .describe('Cursor to fetch the previous page of results'),
          hasMore: z
            .boolean()
            .optional()
            .describe('Whether more results are available beyond this page')
        })
        .optional()
        .describe('Pagination information for navigating result pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTickets({
      status: ctx.input.status,
      teamID: ctx.input.teamID,
      assigneeID: ctx.input.assigneeID,
      tags: ctx.input.tags,
      requesterEmail: ctx.input.requesterEmail,
      createdFrom: ctx.input.createdFrom,
      createdTo: ctx.input.createdTo,
      updatedFrom: ctx.input.updatedFrom,
      updatedTo: ctx.input.updatedTo,
      search: ctx.input.search,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      pageAfter: ctx.input.cursor,
      limit: ctx.input.limit,
      silo: ctx.input.silo
    });

    let tickets = result.data ?? [];

    return {
      output: {
        tickets,
        pagination: result.pagination
          ? {
              after: result.pagination.after,
              before: result.pagination.before,
              hasMore: result.pagination.hasMore
            }
          : undefined
      },
      message: `Found **${tickets.length}** ticket(s).${result.pagination?.hasMore ? ' More results available with pagination.' : ''}`
    };
  })
  .build();
