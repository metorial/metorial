import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let ticketUpdates = SlateTrigger.create(spec, {
  name: 'Ticket Updates',
  key: 'ticket_updates',
  description:
    'Triggers when tickets are created or updated in Freshservice. Polls for recently modified tickets.'
})
  .input(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      subject: z.string().describe('Subject of the ticket'),
      status: z.number().describe('Status'),
      priority: z.number().describe('Priority'),
      type: z.string().nullable().describe('Ticket type'),
      source: z.number().describe('Source'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      tags: z.array(z.string()).nullable().describe('Tags'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      isNew: z.boolean().describe('Whether the ticket was just created')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the ticket'),
      subject: z.string().describe('Subject of the ticket'),
      status: z.number().describe('Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z.number().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      type: z.string().nullable().describe('Ticket type: Incident or Service Request'),
      source: z.number().describe('Source channel'),
      requesterId: z.number().describe('Requester ID'),
      agentId: z.number().nullable().describe('Assigned agent ID'),
      groupId: z.number().nullable().describe('Assigned group ID'),
      departmentId: z.number().nullable().describe('Department ID'),
      category: z.string().nullable().describe('Category'),
      tags: z.array(z.string()).nullable().describe('Tags'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },
    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain,
        authType: ctx.auth.authType
      });

      let lastPolledAt = (ctx.state as Record<string, unknown>)?.lastPolledAt as
        | string
        | undefined;
      let knownTicketIds =
        ((ctx.state as Record<string, unknown>)?.knownTicketIds as number[]) || [];

      let result = await client.listTickets(
        { page: 1, perPage: 100 },
        undefined,
        'updated_at',
        'desc',
        undefined,
        lastPolledAt
      );

      let now = new Date().toISOString();
      let tickets = result.tickets || [];

      let inputs = tickets.map((t: Record<string, unknown>) => ({
        ticketId: t.id as number,
        subject: t.subject as string,
        status: t.status as number,
        priority: t.priority as number,
        type: t.type as string | null,
        source: t.source as number,
        requesterId: t.requester_id as number,
        agentId: t.responder_id as number | null,
        groupId: t.group_id as number | null,
        departmentId: t.department_id as number | null,
        category: t.category as string | null,
        tags: t.tags as string[] | null,
        createdAt: t.created_at as string,
        updatedAt: t.updated_at as string,
        isNew: !knownTicketIds.includes(t.id as number)
      }));

      let updatedKnownIds = [
        ...new Set([
          ...knownTicketIds,
          ...tickets.map((t: Record<string, unknown>) => t.id as number)
        ])
      ].slice(-1000);

      return {
        inputs,
        updatedState: {
          lastPolledAt: now,
          knownTicketIds: updatedKnownIds
        }
      };
    },
    handleEvent: async ctx => {
      let eventType = ctx.input.isNew ? 'ticket.created' : 'ticket.updated';

      return {
        type: eventType,
        id: `${ctx.input.ticketId}-${ctx.input.updatedAt}`,
        output: {
          ticketId: ctx.input.ticketId,
          subject: ctx.input.subject,
          status: ctx.input.status,
          priority: ctx.input.priority,
          type: ctx.input.type,
          source: ctx.input.source,
          requesterId: ctx.input.requesterId,
          agentId: ctx.input.agentId,
          groupId: ctx.input.groupId,
          departmentId: ctx.input.departmentId,
          category: ctx.input.category,
          tags: ctx.input.tags,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
