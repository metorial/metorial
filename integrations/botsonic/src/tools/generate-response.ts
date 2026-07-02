import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { spec } from '../spec';

export let generateResponse = SlateTool.create(spec, {
  name: 'Generate Response',
  key: 'generate_response',
  description: `Send a message to a Botsonic chatbot and receive an AI-generated response based on the bot's training data.
Use this to programmatically interact with a chatbot, get answers to questions, or simulate conversations.
Supports different response formats and can maintain conversation context via chat history.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      inputText: z.string().describe('The message or question to send to the chatbot'),
      chatId: z
        .string()
        .describe('UUID for the chat session. Use the same ID to continue a conversation'),
      chatHistory: z
        .array(z.any())
        .optional()
        .describe('Previous chat messages for maintaining conversation context'),
      responseType: z
        .enum(['text', 'html', 'markdown', 'mrkdwn'])
        .optional()
        .describe('Format of the response. Defaults to text'),
      fullHistory: z
        .boolean()
        .optional()
        .describe('If true, returns the full chat history in the response')
    })
  )
  .output(
    z.object({
      answer: z.string().describe('The AI-generated response text'),
      messageId: z.string().describe('Unique ID of this response message'),
      sources: z.array(z.any()).describe('Sources referenced in generating the response'),
      chatHistory: z.array(z.any()).describe('Chat history including this exchange'),
      followUpQuestions: z.array(z.any()).describe('Suggested follow-up questions'),
      humanHandoffStatus: z.boolean().describe('Whether a human handoff was triggered'),
      chatEnded: z.boolean().describe('Whether the chat session has ended')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(ctx.auth.token);

    let result = await client.generateResponse({
      inputText: ctx.input.inputText,
      chatId: ctx.input.chatId,
      chatHistory: ctx.input.chatHistory,
      responseType: ctx.input.responseType,
      fullHistory: ctx.input.fullHistory
    });

    return {
      output: {
        answer: result.answer,
        messageId: result.message_id,
        sources: result.sources || [],
        chatHistory: result.chat_history || [],
        followUpQuestions: result.follow_up_questions || [],
        humanHandoffStatus: result.human_handoff_status || false,
        chatEnded: result.chat_ended || false
      },
      message: `Generated response for chat **${ctx.input.chatId}**: "${result.answer.substring(0, 200)}${result.answer.length > 200 ? '...' : ''}"`
    };
  })
  .build();
