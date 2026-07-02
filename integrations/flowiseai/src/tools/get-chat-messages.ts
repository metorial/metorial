import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let getChatMessages = SlateTool.create(spec, {
  name: 'Get Chat Messages',
  key: 'get_chat_messages',
  description: `Retrieve chat message history for a specific chatflow. Supports filtering by chat type, session, date range, and feedback status. Useful for auditing, exporting, or reviewing past conversations.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow to get messages for'),
      chatType: z.enum(['INTERNAL', 'EXTERNAL']).optional().describe('Filter by chat type'),
      order: z.enum(['ASC', 'DESC']).optional().describe('Sort order by date'),
      chatId: z.string().optional().describe('Filter by specific chat conversation ID'),
      sessionId: z.string().optional().describe('Filter by session ID'),
      memoryType: z.string().optional().describe('Filter by memory type'),
      startDate: z.string().optional().describe('Filter messages after this date (ISO 8601)'),
      endDate: z.string().optional().describe('Filter messages before this date (ISO 8601)'),
      feedback: z.boolean().optional().describe('Filter to only messages with feedback'),
      feedbackType: z
        .enum(['THUMBS_UP', 'THUMBS_DOWN'])
        .optional()
        .describe('Filter by feedback type')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique message ID'),
            role: z.string().optional().describe('Message role'),
            content: z.string().optional().describe('Message content'),
            chatflowId: z.string().optional().describe('Associated chatflow ID'),
            chatId: z.string().optional().describe('Chat conversation ID'),
            chatType: z.string().optional().describe('Chat type (INTERNAL/EXTERNAL)'),
            sessionId: z.string().optional().nullable().describe('Session ID'),
            memoryType: z.string().optional().nullable().describe('Memory type'),
            sourceDocuments: z
              .string()
              .optional()
              .nullable()
              .describe('Source documents JSON'),
            usedTools: z.string().optional().nullable().describe('Used tools JSON'),
            fileUploads: z.string().optional().nullable().describe('File uploads JSON'),
            agentReasoning: z.string().optional().nullable().describe('Agent reasoning JSON'),
            createdDate: z.string().optional().describe('ISO 8601 creation date'),
            leadEmail: z.string().optional().nullable().describe('Associated lead email')
          })
        )
        .describe('List of chat messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { chatflowId, ...params } = ctx.input;
    let result = await client.getChatMessages(chatflowId, params);
    let messages = Array.isArray(result) ? result : [];

    return {
      output: {
        messages: messages.map((m: any) => ({
          messageId: m.id,
          role: m.role,
          content: m.content,
          chatflowId: m.chatflowid,
          chatId: m.chatId,
          chatType: m.chatType,
          sessionId: m.sessionId,
          memoryType: m.memoryType,
          sourceDocuments: m.sourceDocuments,
          usedTools: m.usedTools,
          fileUploads: m.fileUploads,
          agentReasoning: m.agentReasoning,
          createdDate: m.createdDate,
          leadEmail: m.leadEmail
        }))
      },
      message: `Retrieved **${messages.length}** message(s) for chatflow \`${chatflowId}\`.`
    };
  })
  .build();
