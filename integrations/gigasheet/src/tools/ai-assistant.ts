import { SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { spec } from '../spec';

export let aiAssistant = SlateTool.create(spec, {
  name: 'AI Assistant',
  key: 'ai_assistant',
  description: `Chat with Gigasheet's AI assistant about a sheet's data. The assistant can answer questions about the data, provide insights, and help with analysis. Also supports retrieving and clearing chat history.`
})
  .input(
    z.object({
      sheetHandle: z.string().describe('Handle of the sheet to interact with'),
      action: z
        .enum(['chat', 'get_history', 'clear_history'])
        .default('chat')
        .describe('AI assistant action'),
      message: z
        .string()
        .optional()
        .describe('Message to send to the AI assistant (for chat action)')
    })
  )
  .output(
    z.object({
      result: z.unknown().describe('AI assistant response or history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GigasheetClient({ token: ctx.auth.token });
    let result: unknown;

    switch (ctx.input.action) {
      case 'chat':
        if (!ctx.input.message) throw new Error('message is required for chat');
        result = await client.chatWithAssistant(ctx.input.sheetHandle, ctx.input.message);
        break;

      case 'get_history':
        result = await client.getAssistantHistory(ctx.input.sheetHandle);
        break;

      case 'clear_history':
        await client.deleteAssistantHistory(ctx.input.sheetHandle);
        result = { cleared: true };
        break;
    }

    return {
      output: { result },
      message:
        ctx.input.action === 'chat'
          ? `AI assistant responded to your message.`
          : `AI assistant **${ctx.input.action}** completed.`
    };
  })
  .build();
