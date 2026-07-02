import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessageTool = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message in a conversation and optionally receive the bot's response. Can also use the stateless complete endpoint for one-shot interactions without managing conversation state.`,
  instructions: [
    'For stateless one-shot completions, omit conversationId and provide text and/or messages directly.',
    'For stateful conversations, provide conversationId and set receiveResponse to true to get the bot reply.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversationId: z
        .string()
        .optional()
        .describe('Existing conversation ID (omit for stateless completion)'),
      text: z.string().describe('Message text to send'),
      botId: z
        .string()
        .optional()
        .describe('Bot ID (used for stateless completion when no conversationId)'),
      backstory: z
        .string()
        .optional()
        .describe('Override backstory (for stateless completion)'),
      model: z.string().optional().describe('Override AI model (for stateless completion)'),
      datasetId: z.string().optional().describe('Override dataset (for stateless completion)'),
      skillsetId: z
        .string()
        .optional()
        .describe('Override skillset (for stateless completion)'),
      receiveResponse: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to also receive the bot response'),
      meta: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arbitrary metadata for the message')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional().describe('Conversation ID'),
      sentText: z.string().describe('Text that was sent'),
      responseText: z
        .string()
        .optional()
        .describe('Bot response text (if receiveResponse was true)'),
      usage: z.record(z.string(), z.any()).optional().describe('Token usage information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      runAsUserId: ctx.config.runAsUserId
    });

    let {
      conversationId,
      text,
      botId,
      backstory,
      model,
      datasetId,
      skillsetId,
      receiveResponse,
      meta
    } = ctx.input;

    if (!conversationId) {
      let result = await client.completeConversation({
        text,
        botId,
        backstory,
        model,
        datasetId,
        skillsetId,
        meta
      });
      return {
        output: {
          conversationId: result.conversationId,
          sentText: text,
          responseText: result.text,
          usage: result.usage
        },
        message: `Stateless completion done. Bot replied: "${(result.text || '').substring(0, 200)}"`
      };
    }

    await client.sendMessage(conversationId, { text, meta });

    if (receiveResponse) {
      let response = await client.receiveMessage(conversationId);
      return {
        output: {
          conversationId,
          sentText: text,
          responseText: response.text,
          usage: response.usage
        },
        message: `Message sent and response received in conversation **${conversationId}**. Bot replied: "${(response.text || '').substring(0, 200)}"`
      };
    }

    return {
      output: {
        conversationId,
        sentText: text
      },
      message: `Message sent to conversation **${conversationId}** (no response requested).`
    };
  })
  .build();
