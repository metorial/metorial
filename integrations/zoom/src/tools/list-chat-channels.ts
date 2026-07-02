import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZoomClient } from '../lib/client';
import { spec } from '../spec';

export let listChatChannels = SlateTool.create(spec, {
  name: 'List Chat Channels',
  key: 'list_chat_channels',
  description: `List Zoom Team Chat channels the user belongs to. Returns channel names, IDs, and types for use with sending messages or managing channel membership.`,
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
      pageSize: z.number().optional().describe('Number of records per page'),
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
            channelName: z.string().describe('Channel name'),
            channelType: z
              .number()
              .optional()
              .describe(
                'Channel type: 1=private, 2=private with external, 3=public, 4=instant'
              )
          })
        )
        .describe('List of channels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZoomClient(ctx.auth.token);
    let result = await client.listChatChannels(ctx.input.userId, {
      pageSize: ctx.input.pageSize,
      nextPageToken: ctx.input.nextPageToken
    });

    let channels = (result.channels || []).map((c: any) => ({
      channelId: c.id,
      channelName: c.name,
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
