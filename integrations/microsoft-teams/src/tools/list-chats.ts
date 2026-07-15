import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let listChats = SlateTool.create(spec, {
  name: 'List Chats',
  key: 'list_chats',
  description: `List the authenticated user's chats in Microsoft Teams. Returns chat type (oneOnOne, group, meeting), topic, and last updated time.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.listChats)
  .input(
    z.object({
      top: z.number().optional().describe('Maximum number of chats to return')
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
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let chats = await client.listChats(ctx.input.top);

    let mapped = chats.map((c: any) => ({
      chatId: c.id,
      topic: c.topic || null,
      chatType: c.chatType,
      lastUpdatedDateTime: c.lastUpdatedDateTime,
      webUrl: typeof c.webUrl === 'string' && c.webUrl.length > 0 ? c.webUrl : undefined
    }));

    return {
      output: { chats: mapped },
      message: `Found **${mapped.length}** chats.`
    };
  })
  .build();
