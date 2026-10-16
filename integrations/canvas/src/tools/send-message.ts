import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createCanvasClient } from '../lib/client';
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
      recipients: z
        .array(z.string())
        .describe(
          'Recipient user IDs, UUIDs prefixed with uuid:, or course_/group_ context IDs'
        ),
      bulkMessage: z
        .boolean()
        .optional()
        .describe(
          'Required with groupConversation for course/group audiences over 100 enrollments'
        ),
      attachmentIds: z
        .array(z.string())
        .optional()
        .describe('Previously uploaded file IDs from your conversation attachments folder'),
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
      raw: z.unknown().optional().describe('Complete Canvas response'),
      conversations: z
        .array(z.unknown())
        .optional()
        .describe('All conversations returned by Canvas'),
      conversationId: z.string().describe('Conversation ID'),
      subject: z.string().optional().nullable().describe('Message subject'),
      participantCount: z.number().optional().describe('Number of participants'),
      messageCount: z.number().optional().describe('Number of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = createCanvasClient(ctx.auth, ctx.config);

    if (
      !ctx.input.recipients.length ||
      ctx.input.recipients.some(recipient => !recipient.trim())
    ) {
      throw createApiServiceError('Provide at least one nonempty recipient.');
    }
    if (!ctx.input.body.trim()) throw createApiServiceError('body must contain message text.');
    if (ctx.input.subject !== undefined && ctx.input.subject.length > 255) {
      throw createApiServiceError('subject must be at most 255 characters.');
    }
    let result = await client.createConversation({
      recipients: ctx.input.recipients,
      bulkMessage: ctx.input.bulkMessage,
      attachmentIds: ctx.input.attachmentIds,
      body: ctx.input.body,
      subject: ctx.input.subject,
      groupConversation: ctx.input.groupConversation,
      contextCode: ctx.input.contextCode
    });

    // Canvas returns an array of conversations
    let conversations = Array.isArray(result) ? result : [result];
    let conv = conversations[0];
    if (!conv || conv.id === undefined || conv.id === null) {
      throw createApiServiceError(
        'Canvas did not return a conversation ID. Check your inbox before retrying to avoid sending duplicate messages.'
      );
    }

    return {
      output: {
        raw: result,
        conversations,
        conversationId: String(conv.id),
        subject: conv.subject,
        participantCount: conv.participant_count,
        messageCount: conv.message_count
      },
      message: `Sent message to **${ctx.input.recipients.length}** recipient(s)${ctx.input.subject ? ` with subject "${ctx.input.subject}"` : ''}.`
    };
  })
  .build();
