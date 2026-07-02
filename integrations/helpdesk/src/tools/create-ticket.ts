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
  createdAt: z.string().describe('ISO 8601 timestamp when the ticket was created'),
  updatedAt: z.string().describe('ISO 8601 timestamp when the ticket was last updated')
});

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new HelpDesk ticket. At minimum, a subject and requester email are required. Optionally set initial status, priority, team assignment, agent assignment, tags, followers, CC recipients, and custom field values.`,
  instructions: [
    'The subject and requesterEmail fields are required.',
    'Status defaults to "open" if not specified.',
    'Priority defaults to "medium" if not specified.',
    'Tags, followers, and ccRecipients accept arrays of strings.',
    'Custom fields should be provided as a key-value map where keys are custom field IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject line for the new ticket'),
      requesterEmail: z
        .string()
        .email()
        .describe('Email address of the person requesting support'),
      requesterName: z.string().optional().describe('Display name of the requester'),
      status: z
        .enum(['open', 'pending', 'on hold', 'solved', 'closed'])
        .optional()
        .describe('Initial ticket status (defaults to "open")'),
      priority: z
        .enum(['low', 'medium', 'high', 'urgent'])
        .optional()
        .describe('Ticket priority level (defaults to "medium")'),
      teamID: z.string().optional().describe('ID of the team to assign the ticket to'),
      assigneeID: z.string().optional().describe('ID of the agent to assign the ticket to'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the new ticket'),
      followers: z
        .array(z.string())
        .optional()
        .describe('Agent IDs to add as followers on the ticket'),
      ccRecipients: z
        .array(z.string())
        .optional()
        .describe('Email addresses to CC on ticket correspondence'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom field values as a map of field ID to value')
    })
  )
  .output(
    z.object({
      ticket: ticketSchema.describe('The newly created ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ticket = await client.createTicket({
      subject: ctx.input.subject,
      requester: {
        email: ctx.input.requesterEmail,
        name: ctx.input.requesterName
      },
      status: ctx.input.status,
      priority: ctx.input.priority,
      teamID: ctx.input.teamID,
      assigneeID: ctx.input.assigneeID,
      tags: ctx.input.tags,
      followers: ctx.input.followers,
      ccRecipients: ctx.input.ccRecipients,
      customFields: ctx.input.customFields
    });

    return {
      output: {
        ticket
      },
      message: `Created ticket **${ticket.shortID}**: "${ticket.subject}" (${ticket.status}, ${ticket.priority} priority).`
    };
  })
  .build();
