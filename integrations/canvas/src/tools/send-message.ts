import { SlateTool } from 'slates';
import { z } from 'zod';
import { CanvasClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a Canvas message (conversation) to one or more recipients. Messages can be scoped to a course context. Supports group conversations and bulk messaging.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      recipients: z.array(z.string()).describe('Array of recipient user IDs'),
      body: z.string().describe('Message body text'),
      subject: z.string().optional().describe('Message subject line'),
      contextCode: z.string().optional().describe('Course/group context (e.g., "course_123")'),
      groupConversation: z
        .boolean()
        .optional()
        .describe('Send as a group conversation (true) or individual messages (false)')
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation ID'),
      subject: z.string().optional().nullable().describe('Message subject'),
      participantCount: z.number().optional().describe('Number of participants'),
      messageCount: z.number().optional().describe('Number of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CanvasClient({
      token: ctx.auth.token,
      canvasDomain: ctx.auth.canvasDomain
    });

    let result = await client.createConversation({
      recipients: ctx.input.recipients,
      body: ctx.input.body,
      subject: ctx.input.subject,
      groupConversation: ctx.input.groupConversation,
      contextCode: ctx.input.contextCode
    });

    // Canvas returns an array of conversations
    let conv = Array.isArray(result) ? result[0] : result;

    return {
      output: {
        conversationId: String(conv.id),
        subject: conv.subject,
        participantCount: conv.participant_count,
        messageCount: conv.message_count
      },
      message: `Sent message to **${ctx.input.recipients.length}** recipient(s)${ctx.input.subject ? ` with subject "${ctx.input.subject}"` : ''}.`
    };
  })
  .build();
