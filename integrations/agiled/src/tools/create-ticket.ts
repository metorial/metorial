import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in Agiled. Assign it to a team member with subject, description, and priority.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Ticket subject'),
      description: z.string().optional().describe('Detailed ticket description'),
      agentId: z.string().optional().describe('User ID of the agent to assign the ticket to'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Ticket priority'),
      clientId: z.string().optional().describe('Client/contact ID associated with the ticket'),
      typeId: z.string().optional().describe('Ticket type ID'),
      channelId: z.string().optional().describe('Ticket channel ID (e.g. email, phone)')
    })
  )
  .output(
    z.object({
      ticketId: z.string().describe('ID of the created ticket'),
      subject: z.string().describe('Ticket subject'),
      ticketNumber: z.string().optional().describe('Ticket number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      brand: ctx.auth.brand
    });

    let result = await client.createTicket({
      subject: ctx.input.subject,
      description: ctx.input.description,
      agent_id: ctx.input.agentId,
      priority: ctx.input.priority,
      user_id: ctx.input.clientId,
      type_id: ctx.input.typeId,
      channel_id: ctx.input.channelId
    });

    let ticket = result.data;

    return {
      output: {
        ticketId: String(ticket.id ?? ''),
        subject: String(ticket.subject ?? ctx.input.subject),
        ticketNumber: ticket.ticket_number as string | undefined
      },
      message: `Created ticket **${ctx.input.subject}**.`
    };
  })
  .build();
