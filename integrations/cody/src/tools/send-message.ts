import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message within a conversation and receive the AI-generated response based on the bot's knowledge base. Returns the full response in a single call.`,
  constraints: [
    'Message content must be 2,000 characters or less.',
    'Subject to subscription plan 30-day message limits.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to send the message in'),
      content: z.string().describe('Message content (up to 2,000 characters)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique message identifier'),
      content: z.string().describe('AI-generated response content'),
      conversationId: z.string().describe('Conversation the message belongs to'),
      machine: z.boolean().describe('Whether this is an AI-generated message'),
      failedResponding: z.boolean().describe('Whether response generation failed'),
      flagged: z.boolean().describe('Whether the message violates usage policy'),
      createdAt: z.number().describe('Unix timestamp of creation in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let message = await client.sendMessage({
      content: ctx.input.content,
      conversationId: ctx.input.conversationId
    });

    let status = message.failedResponding
      ? ' (response generation failed)'
      : message.flagged
        ? ' (flagged for policy violation)'
        : '';

    return {
      output: message,
      message: `Received AI response${status}: "${message.content.substring(0, 200)}${message.content.length > 200 ? '...' : ''}"`
    };
  });

export let sendMessageForStream = SlateTool.create(spec, {
  name: 'Send Message for Stream',
  key: 'send_message_stream',
  description: `Send a message and get a streaming URL for receiving the AI response as Server-Sent Events (SSE). Useful for real-time progressive rendering of responses.`,
  instructions: [
    'Connect to the returned stream URL to receive SSE events.',
    'Events contain JSON with a "chunk" field for response text segments.',
    'The stream sends [START] and [END] markers. Close the connection after receiving [END].'
  ],
  constraints: [
    'Message content must be 2,000 characters or less.',
    'Subject to subscription plan 30-day message limits.'
  ]
})
  .input(
    z.object({
      conversationId: z.string().describe('ID of the conversation to send the message in'),
      content: z.string().describe('Message content (up to 2,000 characters)')
    })
  )
  .output(
    z.object({
      streamUrl: z
        .string()
        .describe('SSE stream URL for receiving the AI response in real-time')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendMessageForStream({
      content: ctx.input.content,
      conversationId: ctx.input.conversationId
    });

    return {
      output: result,
      message: `Stream URL generated. Connect to receive the AI response in real-time.`
    };
  });
