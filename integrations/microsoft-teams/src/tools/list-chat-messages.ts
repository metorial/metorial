import { SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import {
  graphMessageOutputFields,
  mapGraphMessage,
  pageSizeInputSchema,
  pageTokenInputSchema
} from '../lib/messages';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

// https://learn.microsoft.com/en-us/graph/api/chat-list-messages?view=graph-rest-1.0
export let listChatMessages = SlateTool.create(spec, {
  name: 'List Chat Messages',
  key: 'list_chat_messages',
  description: `List recent messages in a specific chat, newest first. Returns message content, sender info, and timestamps. Results are paged; pass nextPageToken back as pageToken to continue.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.listChatMessages)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      chatId: z.string().describe('ID of the chat'),
      top: pageSizeInputSchema,
      pageToken: pageTokenInputSchema
    })
  )
  .output(
    z.object({
      messages: z.array(z.object(graphMessageOutputFields)),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pass as pageToken to fetch the next page; absent on the last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let page = await client.listChatMessages(ctx.input.chatId, {
      top: ctx.input.top,
      pageToken: ctx.input.pageToken
    });

    let mapped = page.items.map(mapGraphMessage);

    return {
      output: {
        messages: mapped,
        ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {})
      },
      message: `Found **${mapped.length}** messages in the chat${page.nextPageToken ? ' (more available)' : ''}.`
    };
  })
  .build();
