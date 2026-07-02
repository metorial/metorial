import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ticketSchema } from '../lib/types';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket. Requires a subject and requester email. Content can be provided as plain text, HTML, or both. Optionally include CC/BCC recipients and file attachment IDs.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      subject: z.string().describe('Subject line of the ticket'),
      requesterEmail: z.string().describe('Email address of the person submitting the ticket'),
      contentText: z.string().optional().describe('Plain text body of the ticket'),
      contentHtml: z.string().optional().describe('HTML body of the ticket'),
      cc: z.array(z.string()).optional().describe('CC email addresses'),
      bcc: z.array(z.string()).optional().describe('BCC email addresses'),
      attachmentIds: z
        .array(z.number())
        .optional()
        .describe('IDs of previously uploaded attachments to include')
    })
  )
  .output(ticketSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let ticket = await client.createTicket({
      subject: ctx.input.subject,
      requesterEmail: ctx.input.requesterEmail,
      contentText: ctx.input.contentText,
      contentHtml: ctx.input.contentHtml,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      attachmentIds: ctx.input.attachmentIds
    });

    return {
      output: ticket,
      message: `Created ticket **#${ticket.ticketId}**: "${ticket.subject}" from ${ctx.input.requesterEmail}`
    };
  })
  .build();
