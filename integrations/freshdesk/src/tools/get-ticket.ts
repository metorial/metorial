import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieves a single ticket by ID with full details. Optionally includes conversations, requester info, company info, and stats (resolution/response times).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket to retrieve'),
      includeConversations: z
        .boolean()
        .optional()
        .describe('Include ticket conversations/replies'),
      includeRequester: z.boolean().optional().describe('Include requester contact details'),
      includeStats: z.boolean().optional().describe('Include ticket timing statistics')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('Ticket ID'),
      subject: z.string().describe('Ticket subject'),
      descriptionText: z.string().nullable().describe('Plain text description'),
      status: z.number().describe('Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z.number().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      source: z.number().describe('Channel source of the ticket'),
      type: z.string().nullable().describe('Ticket type'),
      requesterId: z.number().describe('Requester contact ID'),
      responderId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      tags: z.array(z.string()).describe('Ticket tags'),
      ccEmails: z.array(z.string()).describe('CC email addresses'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      dueBy: z.string().nullable().describe('Due date for resolution'),
      frDueBy: z.string().nullable().describe('Due date for first response'),
      customFields: z.record(z.string(), z.any()).describe('Custom field values'),
      conversations: z.array(z.any()).optional().describe('Ticket conversations if requested'),
      requester: z.any().optional().describe('Requester details if requested'),
      stats: z.any().optional().describe('Ticket stats if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let includes: string[] = [];
    if (ctx.input.includeConversations) includes.push('conversations');
    if (ctx.input.includeRequester) includes.push('requester');
    if (ctx.input.includeStats) includes.push('stats');

    let include = includes.length > 0 ? includes.join(',') : undefined;
    let ticket = await client.getTicket(ctx.input.ticketId, include);

    let output: Record<string, any> = {
      ticketId: ticket.id,
      subject: ticket.subject,
      descriptionText: ticket.description_text ?? null,
      status: ticket.status,
      priority: ticket.priority,
      source: ticket.source,
      type: ticket.type ?? null,
      requesterId: ticket.requester_id,
      responderId: ticket.responder_id ?? null,
      groupId: ticket.group_id ?? null,
      tags: ticket.tags ?? [],
      ccEmails: ticket.cc_emails ?? [],
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      dueBy: ticket.due_by ?? null,
      frDueBy: ticket.fr_due_by ?? null,
      customFields: ticket.custom_fields ?? {}
    };

    if (ctx.input.includeConversations && ticket.conversations) {
      output.conversations = ticket.conversations;
    }
    if (ctx.input.includeRequester && ticket.requester) {
      output.requester = ticket.requester;
    }
    if (ctx.input.includeStats && ticket.stats) {
      output.stats = ticket.stats;
    }

    return {
      output: output as any,
      message: `Retrieved ticket **#${ticket.id}**: "${ticket.subject}" (Status: ${ticket.status}, Priority: ${ticket.priority})`
    };
  })
  .build();
