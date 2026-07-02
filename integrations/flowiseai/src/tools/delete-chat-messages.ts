import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let deleteChatMessages = SlateTool.create(spec, {
  name: 'Delete Chat Messages',
  key: 'delete_chat_messages',
  description: `Delete chat messages for a specific chatflow. Can filter by chat ID, session, date range, or chat type. Use \`hardDelete\` to also remove from third-party services.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow whose messages to delete'),
      chatId: z
        .string()
        .optional()
        .describe('Delete messages from a specific chat conversation'),
      chatType: z
        .enum(['INTERNAL', 'EXTERNAL'])
        .optional()
        .describe('Delete only messages of this chat type'),
      sessionId: z.string().optional().describe('Delete messages from a specific session'),
      memoryType: z.string().optional().describe('Delete messages with this memory type'),
      startDate: z.string().optional().describe('Delete messages after this date (ISO 8601)'),
      endDate: z.string().optional().describe('Delete messages before this date (ISO 8601)'),
      feedbackType: z
        .enum(['THUMBS_UP', 'THUMBS_DOWN'])
        .optional()
        .describe('Delete messages with this feedback type'),
      hardDelete: z.boolean().optional().describe('Also delete from third-party services')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let { chatflowId, ...params } = ctx.input;
    await client.deleteChatMessages(chatflowId, params);

    return {
      output: { success: true },
      message: `Deleted chat messages for chatflow \`${chatflowId}\`.`
    };
  })
  .build();
