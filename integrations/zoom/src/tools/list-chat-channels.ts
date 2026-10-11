import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZOOM_USER_AUTH_METHODS } from '../lib/authMethods';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listChatChannels = SlateTool.create(spec, {
  name: 'List Chat Channels',
  key: 'list_chat_channels',
  description: `List Zoom Team Chat channels the user belongs to. Returns channel names, IDs, JIDs, and types for sending or reading messages and listing channel members.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .default('me')
        .describe('User ID or email. Use "me" for the authenticated user'),
      pageSize: z.number().optional().describe('Number of records per page (default 10)'),
      nextPageToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .output(
    z.object({
      totalRecords: z.number().optional().describe('Total number of channels'),
      nextPageToken: z.string().optional().describe('Token for next page'),
      channels: z
        .array(
          z.object({
            channelId: z.string().describe('Channel ID'),
            channelName: z.string().optional().describe('Channel name'),
            channelJid: z
              .string()
              .optional()
              .describe('Channel JID (CHANNEL_ID@conference.xmpp.zoom.us)'),
            channelType: z
              .number()
              .optional()
              .describe(
                'Channel type: 0=unknown, 1=private, 2=private with members from the same account, 3=public, 4=instant (group chat), 5=public with members from other accounts'
              )
          })
        )
        .describe('List of channels')
    })
  )
  .authMethods(ZOOM_USER_AUTH_METHODS)
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listChatChannels(ctx.input.userId, {
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let channels = (result.channels || []).map((c: any) => ({
      channelId: c.id,
      channelName: c.name || undefined,
      channelJid: c.jid || undefined,
      channelType: c.type
    }));

    return {
      output: {
        totalRecords: result.total_records,
        nextPageToken: result.next_page_token || undefined,
        channels
      },
      message: `Found **${channels.length}** chat channel(s).`
    };
  })
  .build();
