import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let markMessageRead = SlateTool.create(spec, {
  name: 'Mark Message as Read',
  key: 'mark_message_read',
  description: `Mark an incoming WhatsApp message as read. This sends a read receipt (blue checkmarks) to the sender and also marks earlier messages in the conversation as read. Optionally shows a typing indicator while you prepare a reply.`,
  instructions: [
    'Only show the typing indicator when you are about to reply; it disappears when you respond or after 25 seconds'
  ],
  constraints: ['Messages can be marked as read only within 30 days of receipt'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to mark as read (wamid.xxx format)'),
      showTypingIndicator: z
        .boolean()
        .optional()
        .describe(
          'Also show a typing indicator to the sender (cleared on reply or after 25 seconds)'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.markMessageAsRead(
      ctx.input.messageId,
      ctx.input.showTypingIndicator
    );

    return {
      output: {
        success: result.success === true
      },
      message: `Marked message \`${ctx.input.messageId}\` as read${ctx.input.showTypingIndicator ? ' and showed a typing indicator' : ''}.`
    };
  })
  .build();
