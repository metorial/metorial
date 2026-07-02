import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, deleteChatbot } from '../lib/client';
import { spec } from '../spec';

export let deleteChatbotTool = SlateTool.create(spec, {
  name: 'Delete Chatbot',
  key: 'delete_chatbot',
  description: `Permanently delete a chatbot from VectorShift. This action cannot be undone.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('ID of the chatbot to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    await deleteChatbot(api, ctx.input.chatbotId);

    return {
      output: { success: true },
      message: `Chatbot \`${ctx.input.chatbotId}\` deleted successfully.`
    };
  })
  .build();
