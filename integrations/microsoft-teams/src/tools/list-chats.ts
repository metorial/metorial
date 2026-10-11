import { SlateTool } from 'slates';
import { z } from 'zod';
import { graphAuthMethodKeys } from '../auth';
import { GraphClient } from '../lib/client';
import { pageSizeInputSchema, pageTokenInputSchema } from '../lib/messages';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

// https://learn.microsoft.com/en-us/graph/api/chat-list?view=graph-rest-1.0
export let listChats = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `List the authenticated user's chats in Microsoft Teams. Returns chat type (oneOnOne, group, meeting), topic, and last updated time. Results are paged; pass nextPageToken back as pageToken to continue.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.listChats)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      top: pageSizeInputSchema,
      pageToken: pageTokenInputSchema
    })
  )
  .output(
    z.object({
      chats: z.array(
        z.object({
          chatId: z.string().describe('Unique identifier of the chat'),
          topic: z.string().nullable().describe('Topic/title of the chat'),
          chatType: z.string().describe('Type of chat: oneOnOne, group, or meeting'),
          lastUpdatedDateTime: z
            .string()
            .optional()
            .describe('When the chat was last updated'),
          webUrl: z.string().optional().describe('URL to open the chat in Teams')
        })
      ),
      nextPageToken: z
        .string()
        .optional()
        .describe('Pass as pageToken to fetch the next page; absent on the last page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let page = await client.listChats({
      top: ctx.input.top,
      pageToken: ctx.input.pageToken
    });

    let mapped = page.items.map((c: any) => ({
      chatId: c.id,
      topic: c.topic || null,
      chatType: c.chatType,
      lastUpdatedDateTime: c.lastUpdatedDateTime,
      webUrl: typeof c.webUrl === 'string' && c.webUrl.length > 0 ? c.webUrl : undefined
    }));

    return {
      output: {
        chats: mapped,
        ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {})
      },
      message: `Found **${mapped.length}** chats${page.nextPageToken ? ' (more available)' : ''}.`
    };
  })
  .build();
