import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, runChatbot } from '../lib/client';
import { spec } from '../spec';

export let runChatbotTool = SlateTool.create(spec, {
  name: 'Run Chatbot',
  key: 'run_chatbot',
  description: `Send a message to a VectorShift chatbot and receive a response. Supports multi-turn conversations by passing a conversation ID. Use for customer support, onboarding, lead collection, and advisory use cases.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      chatbotId: z.string().describe('ID of the chatbot to interact with'),
      text: z.string().describe('Message text to send to the chatbot'),
      conversationId: z
        .string()
        .optional()
        .describe(
          'Conversation ID for continuing an existing conversation. Omit to start a new conversation.'
        )
    })
  )
  .output(
    z.object({
      conversationId: z.string().describe('Conversation session ID for follow-up messages'),
      outputMessage: z.string().describe('Response message from the chatbot'),
      followUpQuestions: z
        .array(z.string())
        .optional()
        .describe('Suggested follow-up questions')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await runChatbot(api, ctx.input.chatbotId, {
      text: ctx.input.text,
      conversationId: ctx.input.conversationId
    });

    return {
      output: {
        conversationId: result.conversation_id ?? '',
        outputMessage: result.output_message ?? '',
        followUpQuestions: result.follow_up_questions
      },
      message: `Chatbot responded. Conversation ID: \`${result.conversation_id}\``
    };
  })
  .build();
