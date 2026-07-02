import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketEventSchema = z.object({
  id: z.string().describe('Unique event ID'),
  type: z
    .string()
    .describe('Event type (e.g. "message", "status_change", "assignment_change")'),
  createdAt: z.string().describe('ISO 8601 timestamp when the event occurred'),
  author: z
    .object({
      id: z.string().optional().describe('Author ID'),
      type: z
        .string()
        .optional()
        .describe('Author type (e.g. "agent", "requester", "system")'),
      name: z.string().optional().describe('Author display name'),
      email: z.string().optional().describe('Author email address')
    })
    .optional()
    .describe('Author of the event'),
  message: z
    .object({
      text: z.string().optional().describe('Plain text message content'),
      html: z.string().optional().describe('HTML formatted message content')
    })
    .optional()
    .describe('Message content if this is a message event'),
  visibility: z
    .enum(['public', 'private'])
    .optional()
    .describe('Whether the event is public (visible to requester) or private (internal note)'),
  attachments: z
    .array(
      z.object({
        id: z.string().describe('Attachment ID'),
        name: z.string().describe('File name'),
        contentType: z.string().describe('MIME content type'),
        size: z.number().describe('File size in bytes'),
        url: z.string().optional().describe('Download URL for the attachment')
      })
    )
    .optional()
    .describe('File attachments on this event')
});

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
  events: z
    .array(ticketEventSchema)
    .optional()
    .describe('Chronological list of events (messages, status changes, etc.) on this ticket'),
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

export let getTicket = SlateTool.create(spec, {
  name: 'Get Ticket',
  key: 'get_ticket',
  description: `Retrieve the full details of a single HelpDesk ticket by its ID. Returns complete ticket information including events (messages and activity), requester details, tags, custom fields, rating, and merge status.`,
  instructions: [
    'Use the ticket ID (not the short ID) to fetch the ticket.',
    'The response includes the full event history with messages, status changes, and other activity.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The unique ID of the ticket to retrieve')
    })
  )
  .output(
    z.object({
      ticket: ticketSchema.describe('The full ticket object with all details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let ticket = await client.getTicket(ctx.input.ticketId);

    return {
      output: {
        ticket
      },
      message: `Retrieved ticket **${ticket.shortID}**: "${ticket.subject}" (${ticket.status}, ${ticket.priority} priority).`
    };
  })
  .build();
