import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket with an initial message. Supports API, email, chat, phone, and SMS channels. A ticket always requires at least one message.`,
  instructions: [
    'For "api" channel, set both channel and via to "api".',
    'For "email" channel, include source.from and source.to in the message.',
    'Set fromAgent to false for customer messages and true for agent-initiated messages.'
  ]
})
  .input(
    z.object({
      customerEmail: z.string().describe('Email address of the customer'),
      channel: z
        .enum(['api', 'email', 'chat', 'phone', 'sms'])
        .default('api')
        .describe('Channel for the ticket'),
      subject: z.string().optional().describe('Ticket subject'),
      bodyHtml: z.string().optional().describe('HTML body of the initial message'),
      bodyText: z.string().optional().describe('Plain text body of the initial message'),
      fromAgent: z.boolean().default(false).describe('Whether the message is from an agent'),
      status: z.enum(['open', 'closed']).default('open').describe('Initial ticket status'),
      priority: z
        .enum(['urgent', 'high', 'normal', 'low'])
        .optional()
        .describe('Ticket priority'),
      tags: z.array(z.string()).optional().describe('Tag names to apply to the ticket'),
      assigneeUserId: z.number().optional().describe('User ID of the agent to assign'),
      assigneeTeamId: z.number().optional().describe('Team ID to assign'),
      externalId: z.string().optional().describe('External system identifier'),
      meta: z.record(z.string(), z.any()).optional().describe('Custom key-value metadata')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the created ticket'),
      status: z.string().describe('Ticket status'),
      subject: z.string().nullable().describe('Ticket subject'),
      createdDatetime: z.string().nullable().describe('When the ticket was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let message: any = {
      channel: ctx.input.channel,
      via: ctx.input.channel,
      from_agent: ctx.input.fromAgent,
      sender: { email: ctx.input.customerEmail },
      body_html: ctx.input.bodyHtml,
      body_text: ctx.input.bodyText,
      stripped_text: ctx.input.bodyText,
      subject: ctx.input.subject
    };

    if (ctx.input.channel === 'email') {
      message.source = {
        from: { address: ctx.input.customerEmail },
        to: []
      };
    }

    let ticketData: any = {
      customer: { email: ctx.input.customerEmail },
      messages: [message],
      channel: ctx.input.channel,
      via: ctx.input.channel,
      from_agent: ctx.input.fromAgent,
      status: ctx.input.status,
      subject: ctx.input.subject,
      external_id: ctx.input.externalId,
      meta: ctx.input.meta
    };

    if (ctx.input.priority) {
      ticketData.priority = ctx.input.priority;
    }

    if (ctx.input.tags && ctx.input.tags.length > 0) {
      ticketData.tags = ctx.input.tags.map(name => ({ name }));
    }

    if (ctx.input.assigneeUserId) {
      ticketData.assignee_user = { id: ctx.input.assigneeUserId };
    }

    if (ctx.input.assigneeTeamId) {
      ticketData.assignee_team = { id: ctx.input.assigneeTeamId };
    }

    let ticket = await client.createTicket(ticketData);

    return {
      output: {
        ticketId: ticket.id,
        status: ticket.status,
        subject: ticket.subject || null,
        createdDatetime: ticket.created_datetime || null
      },
      message: `Created ticket **#${ticket.id}** — "${ticket.subject || 'No subject'}" (${ticket.status}).`
    };
  })
  .build();
