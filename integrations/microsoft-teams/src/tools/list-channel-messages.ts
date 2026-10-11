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

// https://learn.microsoft.com/en-us/graph/api/channel-list-messages?view=graph-rest-1.0
// https://learn.microsoft.com/en-us/graph/api/chatmessage-list-replies?view=graph-rest-1.0
export let listChannelMessages = SlateTool.create(spec, {
  name: 'List Channel Messages',
  key: 'list_channel_messages',
  description: `List recent messages in a team channel. Returns message content, sender information, and timestamps. Optionally fetch replies for a specific message. Results are paged; pass nextPageToken back as pageToken to continue.`,
  tags: {
    readOnly: true
  }
})
  .scopes(microsoftTeamsActionScopes.listChannelMessages)
  .authMethods(graphAuthMethodKeys)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      channelId: z.string().describe('ID of the channel'),
      messageId: z
        .string()
        .optional()
        .describe('If provided, list replies to this specific message'),
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
    let options = { top: ctx.input.top, pageToken: ctx.input.pageToken };

    let page = ctx.input.messageId
      ? await client.listMessageReplies(
          ctx.input.teamId,
          ctx.input.channelId,
          ctx.input.messageId,
          options
        )
      : await client.listChannelMessages(ctx.input.teamId, ctx.input.channelId, options);

    let mapped = page.items.map(mapGraphMessage);

    return {
      output: {
        messages: mapped,
        ...(page.nextPageToken ? { nextPageToken: page.nextPageToken } : {})
      },
      message: ctx.input.messageId
        ? `Found **${mapped.length}** replies to message${page.nextPageToken ? ' (more available)' : ''}.`
        : `Found **${mapped.length}** messages in channel${page.nextPageToken ? ' (more available)' : ''}.`
    };
  })
  .build();
