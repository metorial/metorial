import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createMessengerClient } from '../lib/client';
import { spec } from '../spec';

export let listConversations = SlateTool.create(spec, {
  name: 'List Conversations',
  key: 'list_conversations',
  description: `List the Page's Messenger conversations with each participant's Page-scoped ID (PSID). Optionally find the conversation with one person by their PSID.`,
  instructions: [
    'Use the participant PSID (not the Page ID) as recipientId when sending messages.',
    'Pass nextCursor back as cursor to load the next page.',
    'Use List Conversation Messages with a conversationId to read its messages.'
  ],
  constraints: [
    'Requires the pages_messaging, pages_manage_metadata, and pages_read_engagement permissions; a token generated in the Messenger settings with only pages_messaging is refused.',
    'Conversations in the Requests folder that have been inactive for 30 days are not returned.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Page-scoped ID (PSID) of a person, to return only the conversation with them'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of conversations to return (1-100)'),
      cursor: z
        .string()
        .min(1)
        .optional()
        .describe('nextCursor from a previous List Conversations result')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.string().describe('Conversation ID'),
            updatedTime: z
              .string()
              .optional()
              .describe('Time the last message was added to the conversation'),
            participants: z
              .array(
                z.object({
                  id: z.string().describe('PSID of the person, or the Page ID for the Page'),
                  name: z.string().optional().describe('Participant name'),
                  email: z.string().optional().describe('Participant email, when available')
                })
              )
              .describe('Participants in the conversation, including the Page')
          })
        )
        .describe('Conversations on this page of results'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for the next page; absent when there are no more conversations')
    })
  )
  .handleInvocation(async ctx => {
    let client = createMessengerClient(ctx);
    let page = await client.listConversations({
      userId: ctx.input.userId,
      limit: ctx.input.limit,
      after: ctx.input.cursor
    });

    return {
      output: {
        conversations: page.items,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {})
      },
      message: `Found **${page.items.length}** Messenger conversation${page.items.length === 1 ? '' : 's'}${page.nextCursor ? ' (more available)' : ''}.`
    };
  })
  .build();
