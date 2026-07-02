import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreshdeskClient } from '../lib/client';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Creates a new support ticket in Freshdesk. Supports setting subject, description, requester, priority, status, assignee, tags, and custom fields. Can also create outbound email tickets to initiate customer conversations.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject of the ticket'),
      description: z.string().describe('HTML content of the ticket description'),
      requesterId: z
        .number()
        .optional()
        .describe('ID of the requester contact. Required if email is not provided.'),
      email: z
        .string()
        .optional()
        .describe(
          'Email of the requester. A new contact is created if not found. Required if requesterId is not provided.'
        ),
      phone: z
        .string()
        .optional()
        .describe('Phone number of the requester. Required if no email or requesterId.'),
      name: z.string().optional().describe('Name of the requester'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      status: z
        .number()
        .optional()
        .describe('Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      source: z
        .number()
        .optional()
        .describe(
          'Source: 1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email'
        ),
      type: z
        .string()
        .optional()
        .describe('Ticket type (e.g., "Question", "Incident", "Problem", "Feature Request")'),
      groupId: z.number().optional().describe('ID of the group to assign the ticket to'),
      responderId: z.number().optional().describe('ID of the agent to assign the ticket to'),
      ccEmails: z.array(z.string()).optional().describe('Email addresses to CC on the ticket'),
      tags: z.array(z.string()).optional().describe('Tags to associate with the ticket'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom field key-value pairs')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the created ticket'),
      subject: z.string().describe('Subject of the created ticket'),
      status: z.number().describe('Status of the ticket'),
      priority: z.number().describe('Priority of the ticket'),
      createdAt: z.string().describe('Timestamp when the ticket was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreshdeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token
    });

    let ticketData: Record<string, any> = {
      subject: ctx.input.subject,
      description: ctx.input.description
    };

    if (ctx.input.requesterId) ticketData.requester_id = ctx.input.requesterId;
    if (ctx.input.email) ticketData.email = ctx.input.email;
    if (ctx.input.phone) ticketData.phone = ctx.input.phone;
    if (ctx.input.name) ticketData.name = ctx.input.name;
    if (ctx.input.priority) ticketData.priority = ctx.input.priority;
    if (ctx.input.status) ticketData.status = ctx.input.status;
    if (ctx.input.source) ticketData.source = ctx.input.source;
    if (ctx.input.type) ticketData.type = ctx.input.type;
    if (ctx.input.groupId) ticketData.group_id = ctx.input.groupId;
    if (ctx.input.responderId) ticketData.responder_id = ctx.input.responderId;
    if (ctx.input.ccEmails) ticketData.cc_emails = ctx.input.ccEmails;
    if (ctx.input.tags) ticketData.tags = ctx.input.tags;
    if (ctx.input.customFields) ticketData.custom_fields = ctx.input.customFields;

    let ticket = await client.createTicket(ticketData);

    return {
      output: {
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at
      },
      message: `Created ticket **#${ticket.id}**: "${ticket.subject}"`
    };
  })
  .build();
