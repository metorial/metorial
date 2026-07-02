import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, terminateChatbotSession } from '../lib/client';
import { spec } from '../spec';

export let terminateChatbotSessionTool = SlateTool.create(spec, {
  name: 'Terminate Chatbot Session',
  key: 'terminate_chatbot_session',
  description: `Terminate an active chatbot conversation session. Use this to end long-running or stuck chatbot sessions.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('ID of the chatbot'),
      pipelineRunId: z.string().describe('Pipeline run ID of the active session to terminate')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the termination was successful')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    await terminateChatbotSession(api, ctx.input.chatbotId, ctx.input.pipelineRunId);

    return {
      output: { success: true },
      message: `Chatbot session terminated for chatbot \`${ctx.input.chatbotId}\`.`
    };
  })
  .build();
