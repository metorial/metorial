import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let createTicket = SlateTool.create(spec, {
  name: 'Create Ticket',
  key: 'create_ticket',
  description: `Create a new support ticket in Gleap. Can be used for bug reports, feature requests, or general support tickets. Optionally link to a session (contact).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      title: z.string().optional().describe('Title of the ticket'),
      description: z.string().optional().describe('Description of the ticket'),
      type: z.string().optional().describe('Ticket type (e.g. BUG, FEATURE_REQUEST)'),
      status: z.string().optional().describe('Initial status (e.g. OPEN)'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('Priority level'),
      plainContent: z.string().optional().describe('Plain text content of the ticket'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the ticket'),
      processingUser: z.string().optional().describe('ID of the user to assign the ticket to'),
      processingTeam: z.string().optional().describe('ID of the team to assign the ticket to'),
      sessionId: z.string().optional().describe('Session (contact) ID to link the ticket to'),
      customData: z.record(z.string(), z.any()).optional().describe('Custom data attributes'),
      formData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Form data submitted with the ticket')
    })
  )
  .output(
    z.object({
      ticket: z.record(z.string(), z.any()).describe('The created ticket object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let { sessionId, ...rest } = ctx.input;
    let ticketData: Record<string, any> = { ...rest };
    if (sessionId) {
      ticketData.session = sessionId;
    }

    let ticket = await client.createTicket(ticketData);

    return {
      output: { ticket },
      message: `Created ticket **${ticket.title || ticket._id || 'new ticket'}**.`
    };
  })
  .build();
