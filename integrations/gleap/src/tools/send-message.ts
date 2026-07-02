import { SlateTool } from 'slates';
import { z } from 'zod';
import { GleapClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Add a message or comment to a ticket. Supports agent replies, internal notes, and customer comments. Can include file attachments.`,
  instructions: [
    'Set isNote to true to create an internal note visible only to agents.',
    'Provide sessionId to post as a specific customer/contact.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ticket ID to add the message to'),
      text: z.string().describe('The message text content'),
      isNote: z
        .boolean()
        .optional()
        .describe('If true, creates an internal note (not visible to customer)'),
      sessionId: z
        .string()
        .optional()
        .describe('Session ID to post the message as a specific customer'),
      attachments: z
        .array(
          z.object({
            name: z.string().describe('File name'),
            url: z.string().describe('URL of the file'),
            type: z.string().optional().describe('MIME type of the file')
          })
        )
        .optional()
        .describe('File attachments to include')
    })
  )
  .output(
    z.object({
      message: z.record(z.string(), z.any()).describe('The created message object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GleapClient({
      token: ctx.auth.token,
      projectId: ctx.auth.projectId
    });

    let result = await client.createMessage({
      ticket: ctx.input.ticketId,
      comment: {
        text: ctx.input.text
      },
      isNote: ctx.input.isNote,
      session: ctx.input.sessionId,
      attachments: ctx.input.attachments
    });

    return {
      output: { message: result },
      message: ctx.input.isNote
        ? `Added internal note to ticket **${ctx.input.ticketId}**.`
        : `Sent message to ticket **${ctx.input.ticketId}**.`
    };
  })
  .build();
