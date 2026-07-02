import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve direct message conversations from Facebook, Instagram, or X/Twitter. Can list all conversations or fetch messages from a specific conversation.`,
  constraints: [
    'Initial message history is limited to the last 20 messages for Facebook and Instagram.',
    'X/Twitter messages may have up to 3-minute delays for new updates.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      platform: z
        .enum(['facebook', 'instagram', 'twitter'])
        .describe('Platform to get messages from'),
      status: z
        .enum(['active', 'archived'])
        .optional()
        .describe('Filter by conversation status (default: active)'),
      conversationId: z.string().optional().describe('Specific conversation ID to retrieve'),
      conversationsOnly: z
        .boolean()
        .optional()
        .describe('Only retrieve conversation list without message details')
    })
  )
  .output(
    z.object({
      messages: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Message objects with sender/recipient details, timestamps, and content'),
      conversationIds: z.array(z.string()).optional().describe('List of conversation IDs'),
      conversationDetails: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Participant information and conversation metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      profileKey: ctx.config.profileKey
    });

    let result = await client.getMessages({
      platform: ctx.input.platform,
      status: ctx.input.status,
      conversationId: ctx.input.conversationId,
      conversationsOnly: ctx.input.conversationsOnly
    });

    return {
      output: {
        messages: result.messages,
        conversationIds: result.conversationIds,
        conversationDetails: result.conversationsDetails
      },
      message: ctx.input.conversationsOnly
        ? `Retrieved **${(result.conversationIds || []).length}** conversations from **${ctx.input.platform}**.`
        : `Retrieved messages from **${ctx.input.platform}**${ctx.input.conversationId ? ` for conversation **${ctx.input.conversationId}**` : ''}.`
    };
  })
  .build();
