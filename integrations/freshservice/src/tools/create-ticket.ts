import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new ticket (incident or service request) in Freshservice. You must provide either **email**, **phone**, or **requesterId** to identify the requester.

Priority: 1=Low, 2=Medium, 3=High, 4=Urgent.
Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed.
Source: 1=Email, 2=Portal, 3=Phone, 7=Chat, 9=Feedback Widget, 10=Outbound Email.`,
  instructions: [
    'Provide at least a subject and one requester identifier (email, phone, or requesterId).',
    'Use numeric values for priority, status, and source fields.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject/title of the ticket'),
      description: z.string().optional().describe('HTML content of the ticket description'),
      email: z
        .string()
        .optional()
        .describe('Email of the requester (alternative to requesterId)'),
      requesterId: z.number().optional().describe('User ID of the requester'),
      phone: z.string().optional().describe('Phone number of the requester'),
      status: z
        .number()
        .optional()
        .describe('Status: 2=Open, 3=Pending, 4=Resolved, 5=Closed'),
      priority: z.number().optional().describe('Priority: 1=Low, 2=Medium, 3=High, 4=Urgent'),
      source: z.number().optional().describe('Source: 1=Email, 2=Portal, 3=Phone, 7=Chat'),
      type: z.string().optional().describe('Ticket type: "Incident" or "Service Request"'),
      groupId: z.number().optional().describe('ID of the agent group to assign the ticket to'),
      agentId: z.number().optional().describe('ID of the agent to assign the ticket to'),
      departmentId: z.number().optional().describe('ID of the department'),
      category: z.string().optional().describe('Ticket category'),
      subCategory: z.string().optional().describe('Ticket sub-category'),
      itemCategory: z.string().optional().describe('Ticket item category'),
      urgency: z.number().optional().describe('Urgency: 1=Low, 2=Medium, 3=High'),
      impact: z.number().optional().describe('Impact: 1=Low, 2=Medium, 3=High'),
      ccEmails: z.array(z.string()).optional().describe('List of CC email addresses'),
      tags: z.array(z.string()).optional().describe('Tags associated with the ticket'),
      dueBy: z.string().optional().describe('Due date (ISO 8601 format)'),
      frDueBy: z.string().optional().describe('First response due date (ISO 8601 format)'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Key-value pairs of custom fields')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the created ticket'),
      subject: z.string().describe('Subject of the ticket'),
      status: z.number().describe('Status of the ticket'),
      priority: z.number().describe('Priority of the ticket'),
      type: z.string().nullable().describe('Type of the ticket'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let ticket = await client.createTicket(ctx.input);

    return {
      output: {
        ticketId: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        type: ticket.type,
        createdAt: ticket.created_at
      },
      message: `Created ticket **#${ticket.id}**: "${ticket.subject}"`
    };
  })
  .build();
