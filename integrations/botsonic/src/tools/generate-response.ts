import { SlateTool } from 'slates';
import { z } from 'zod';
import { BusinessClient } from '../lib/client';
import { botIdSchema, workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateResponse = SlateTool.create(spec, {
  name: 'Generate Response',
  key: 'generate_response',
  description: `Send a message to a Botsonic chatbot and receive an AI-generated response based on the bot's training data.
Use this to programmatically interact with a chatbot, get answers to questions, or simulate conversations.
Supports different response formats and can maintain conversation context via chat history.`,
  instructions: [
    'For account API key connections, call list_bots and provide botId. A Bot API Token connection targets the bot owning that token.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      inputText: z.string().min(1).describe('The message or question to send to the chatbot'),
      chatId: z
        .string()
        .describe('UUID for the chat session. Use the same ID to continue a conversation'),
      source: z
        .string()
        .optional()
        .describe('Source content to refer to when generating the response'),
      starterQuestionId: z
        .string()
        .optional()
        .describe('Starter question ID from list_starter_questions'),
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
      messageId: z.string().optional().describe('Unique ID of this response message'),
      sources: z.array(z.any()).describe('Sources referenced in generating the response'),
      source: z
        .string()
        .optional()
        .describe('Source content to refer to when generating the response'),
      starterQuestionId: z
        .string()
        .optional()
        .describe('Starter question ID from list_starter_questions'),
      chatHistory: z.array(z.any()).describe('Chat history including this exchange'),
      followUpQuestions: z.array(z.any()).describe('Suggested follow-up questions'),
      humanHandoffStatus: z.boolean().describe('Whether a human handoff was triggered'),
      chatEnded: z.boolean().describe('Whether the chat session has ended')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BusinessClient(
      ctx.auth.token,
      ctx.auth.credentialType,
      ctx.input.botId,
      ctx.input.workspaceId
    );

    let result = await client.generateResponse({
      inputText: ctx.input.inputText,
      chatId: ctx.input.chatId,
      chatHistory: ctx.input.chatHistory,
      source: ctx.input.source,
      starterQuestionId: ctx.input.starterQuestionId,
      responseType: ctx.input.responseType,
      fullHistory: ctx.input.fullHistory
    });

    return {
      output: {
        answer: result.answer,
        messageId: result.message_id ?? undefined,
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
