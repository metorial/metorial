import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message to an AI agent and receive a response with citations. Creates a new conversation if no session ID is provided, or continues an existing conversation. Responses include source citations from the agent's knowledge base.`,
  instructions: [
    'If no sessionId is provided, a new conversation will be created automatically.',
    'Use labels to restrict the agent to only search within specific labeled content.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.number().describe('ID of the agent to send the message to'),
      sessionId: z
        .string()
        .optional()
        .describe(
          'Session ID of an existing conversation. If omitted, a new conversation is created.'
        ),
      message: z.string().describe('The message/question to send to the agent'),
      lang: z
        .string()
        .optional()
        .describe('Language code for the response (e.g. "en", "fr", "es")'),
      labels: z.array(z.string()).optional().describe('Labels to filter source content'),
      labelsExclusive: z
        .boolean()
        .optional()
        .describe('If true, only search within labeled pages')
    })
  )
  .output(
    z.object({
      sessionId: z.string().describe('Conversation session ID'),
      promptId: z.number().describe('Message prompt ID for referencing this exchange'),
      userQuery: z.string().describe('The user query that was sent'),
      agentResponse: z.string().describe('The agent response text'),
      citations: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Citation sources referenced in the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });

    let sessionId = ctx.input.sessionId;
    if (!sessionId) {
      let conversation = await client.createConversation(ctx.input.projectId);
      sessionId = conversation.sessionId;
    }

    let message = await client.sendMessage(ctx.input.projectId, sessionId, {
      message: ctx.input.message,
      lang: ctx.input.lang,
      labels: ctx.input.labels,
      labelsExclusive: ctx.input.labelsExclusive
    });

    let preview =
      message.openaiResponse.length > 200
        ? `${message.openaiResponse.substring(0, 200)}...`
        : message.openaiResponse;

    return {
      output: {
        sessionId,
        promptId: message.promptId,
        userQuery: message.userQuery,
        agentResponse: message.openaiResponse,
        citations: message.citations
      },
      message: `Agent responded in session **${sessionId}** with **${message.citations.length}** citation(s).\n\n> ${preview}`
    };
  })
  .build();
