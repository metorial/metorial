import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let updateTicket = SlateTool.create(spec, {
  name: 'Update Ticket',
  key: 'update_ticket',
  description: `Update an existing support ticket. Modify status, priority, assignment, tags, content, and other properties. Can also archive or snooze tickets.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ID of the ticket to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.string().optional().describe('New status (e.g. OPEN, DONE, SNOOZED)'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional().describe('New priority level'),
      plainContent: z.string().optional().describe('New plain text content'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      processingUser: z.string().optional().describe('ID of the user to reassign to'),
      processingTeam: z.string().optional().describe('ID of the team to reassign to'),
      archived: z.boolean().optional().describe('Set to true to archive, false to unarchive'),
      snoozedUntil: z
        .string()
        .optional()
        .describe('ISO 8601 date until which to snooze the ticket'),
      customData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom data attributes to update'),
      formData: z.record(z.string(), z.any()).optional().describe('Form data to update')
    })
  )
  .output(
    z.object({
      ticket: z
        .record(z.string(), z.any())
        .describe('The updated ticket object or confirmation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let { ticketId, ...updateData } = ctx.input;

    // Remove undefined values
    let cleanData: Record<string, any> = {};
    for (let [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        cleanData[key] = value;
      }
    }

    let result = await client.updateTicket(ticketId, cleanData);

    return {
      output: { ticket: result },
      message: `Updated ticket **${ticketId}**.`
    };
  })
  .build();
