import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let sendPrediction = SlateTool.create(spec, {
  name: 'Send Prediction',
  key: 'send_prediction',
  description: `Send a message to a chatflow, assistant, or agentflow and receive an AI-generated response. Use this to interact with any deployed Flowise flow by providing a question and optional context like conversation history, file uploads, or configuration overrides.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z
        .string()
        .describe('ID of the chatflow, assistant, or agentflow to send the message to'),
      question: z.string().describe('The message or question to send'),
      sessionId: z.string().optional().describe('Session ID for conversation continuity'),
      overrideConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration overrides (e.g. temperature, maxTokens, vars)'),
      history: z
        .array(
          z.object({
            role: z.enum(['apiMessage', 'userMessage']).describe('Role of the message sender'),
            content: z.string().describe('Message content')
          })
        )
        .optional()
        .describe('Conversation history for context'),
      uploads: z
        .array(
          z.object({
            data: z.string().describe('Base64-encoded data or URL of the file'),
            type: z.enum(['file', 'url', 'audio']).describe('Type of upload'),
            name: z.string().optional().describe('Filename'),
            mime: z.string().optional().describe('MIME type of the file')
          })
        )
        .optional()
        .describe('File uploads to include with the message')
    })
  )
  .output(
    z.object({
      text: z.string().optional().describe('The AI-generated response text'),
      json: z.any().optional().describe('Structured JSON response if available'),
      question: z.string().optional().describe('The original question sent'),
      chatId: z.string().optional().describe('Chat conversation ID'),
      chatMessageId: z.string().optional().describe('Unique ID of this chat message'),
      sessionId: z.string().optional().nullable().describe('Session ID used'),
      sourceDocuments: z
        .array(z.any())
        .optional()
        .describe('Source documents used in the response'),
      usedTools: z
        .array(z.any())
        .optional()
        .describe('Tools invoked during response generation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let overrideConfig =
      ctx.input.overrideConfig || ctx.input.sessionId
        ? {
            ...(ctx.input.overrideConfig || {}),
            ...(ctx.input.sessionId ? { sessionId: ctx.input.sessionId } : {})
          }
        : undefined;

    let result = await client.sendPrediction(ctx.input.chatflowId, {
      question: ctx.input.question,
      overrideConfig,
      history: ctx.input.history,
      uploads: ctx.input.uploads
    });

    return {
      output: {
        text: result.text,
        json: result.json,
        question: result.question,
        chatId: result.chatId,
        chatMessageId: result.chatMessageId,
        sessionId: result.sessionId,
        sourceDocuments: result.sourceDocuments,
        usedTools: result.usedTools
      },
      message: `Sent message to chatflow \`${ctx.input.chatflowId}\`. Response: ${result.text ? result.text.substring(0, 200) + (result.text.length > 200 ? '...' : '') : 'No text response'}`
    };
  })
  .build();
