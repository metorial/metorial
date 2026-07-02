import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search for messages across channels by keyword. Optionally narrow results to a specific channel, time range, or sender.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search keyword'),
      channelUrl: z.string().optional().describe('Limit search to a specific channel URL'),
      channelCustomType: z.string().optional().describe('Filter by channel custom type'),
      limit: z.number().optional().describe('Max results to return (default 20)'),
      beforeTimestamp: z
        .number()
        .optional()
        .describe('Only include messages before this Unix timestamp'),
      afterTimestamp: z
        .number()
        .optional()
        .describe('Only include messages after this Unix timestamp'),
      nextToken: z.string().optional().describe('Pagination token for fetching more results'),
      sortField: z
        .enum(['score', 'created_at'])
        .optional()
        .describe('Sort results by relevance score or creation time')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            messageId: z.number().describe('Message ID'),
            message: z.string().optional().describe('Message text'),
            messageType: z.string().describe('Type of message'),
            channelUrl: z.string().describe('Channel URL containing the message'),
            senderId: z.string().optional().describe('Sender user ID'),
            senderNickname: z.string().optional().describe('Sender nickname'),
            createdAt: z.number().describe('Message creation timestamp')
          })
        )
        .describe('Search results'),
      hasNext: z.boolean().describe('Whether more results are available'),
      nextToken: z.string().optional().describe('Pagination token for next results'),
      totalCount: z.number().optional().describe('Total number of matching messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.searchMessages({
      query: ctx.input.query,
      channelUrl: ctx.input.channelUrl,
      channelCustomType: ctx.input.channelCustomType,
      limit: ctx.input.limit,
      beforeTimestamp: ctx.input.beforeTimestamp,
      afterTimestamp: ctx.input.afterTimestamp,
      token: ctx.input.nextToken,
      sortField: ctx.input.sortField
    });

    let results = (result.results ?? []).map((r: any) => ({
      messageId: r.message_id,
      message: r.message,
      messageType: r.type ?? '',
      channelUrl: r.channel_url ?? '',
      senderId: r.user?.user_id,
      senderNickname: r.user?.nickname,
      createdAt: r.created_at ?? 0
    }));

    return {
      output: {
        results,
        hasNext: result.has_next ?? false,
        nextToken: result.next || undefined,
        totalCount: result.total_count
      },
      message: `Found **${results.length}** message(s) matching "${ctx.input.query}".${result.has_next ? ' More results available.' : ''}`
    };
  })
  .build();
