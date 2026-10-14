import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { SendbirdChatClient } from '../lib/client';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search messages in a group channel or in up to 100 group channels joined by a user. Provide exactly one of channelUrl or userId. Message search must be enabled for the application.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search keyword'),
      channelUrl: z.string().optional().describe('Limit search to a specific channel URL'),
      userId: z
        .string()
        .optional()
        .describe(
          'Search group channels joined by this user; cannot be combined with channelUrl'
        ),
      channelCustomType: z
        .string()
        .optional()
        .describe('Filter by channel custom type when searching by userId'),
      limit: z.number().optional().describe('Max results to return (default 20)'),
      beforeTimestamp: z
        .number()
        .optional()
        .describe('Include messages at or before this Unix timestamp in milliseconds'),
      afterTimestamp: z
        .number()
        .optional()
        .describe('Include messages at or after this Unix timestamp in milliseconds'),
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
    if (
      (ctx.input.channelUrl !== undefined && !ctx.input.channelUrl.trim()) ||
      (ctx.input.userId !== undefined && !ctx.input.userId.trim())
    ) {
      throw createApiServiceError('channelUrl and userId must be non-empty when provided.');
    }
    if (!!ctx.input.channelUrl?.trim() === !!ctx.input.userId?.trim()) {
      throw createApiServiceError(
        'Provide exactly one of channelUrl or userId for message search.'
      );
    }
    if (ctx.input.channelCustomType !== undefined && !ctx.input.userId) {
      throw createApiServiceError('channelCustomType requires userId; omit channelUrl.');
    }
    if (
      ctx.input.limit !== undefined &&
      (!Number.isSafeInteger(ctx.input.limit) || ctx.input.limit < 1 || ctx.input.limit > 99)
    ) {
      throw createApiServiceError('limit must be a whole number from 1 to 99.');
    }
    for (let timestamp of [ctx.input.beforeTimestamp, ctx.input.afterTimestamp]) {
      if (timestamp !== undefined && (!Number.isSafeInteger(timestamp) || timestamp < 0)) {
        throw createApiServiceError(
          'Search timestamps must be non-negative whole numbers in milliseconds.'
        );
      }
    }
    if (
      ctx.input.beforeTimestamp !== undefined &&
      ctx.input.afterTimestamp !== undefined &&
      ctx.input.afterTimestamp > ctx.input.beforeTimestamp
    ) {
      throw createApiServiceError(
        'afterTimestamp must be less than or equal to beforeTimestamp.'
      );
    }
    let client = new SendbirdChatClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token
    });

    let result = await client.searchMessages({
      query: ctx.input.query,
      channelUrl: ctx.input.channelUrl,
      userId: ctx.input.userId,
      channelCustomType: ctx.input.channelCustomType,
      limit: ctx.input.limit,
      beforeTimestamp: ctx.input.beforeTimestamp,
      afterTimestamp: ctx.input.afterTimestamp,
      token: ctx.input.nextToken,
      sortField: ctx.input.sortField
    });

    let results = (result.results ?? []).map((r: any) => ({
      messageId: r.message_id,
      message: r.message ?? undefined,
      messageType: r.type ?? '',
      channelUrl: r.channel_url ?? '',
      senderId: r.user?.user_id ?? undefined,
      senderNickname: r.user?.nickname ?? undefined,
      createdAt: r.created_at ?? 0
    }));

    return {
      output: {
        results,
        hasNext: result.has_next ?? false,
        nextToken: result.next || undefined,
        totalCount: result.total_count ?? undefined
      },
      message: `Found **${results.length}** message(s) matching "${ctx.input.query}".${result.has_next ? ' More results available.' : ''}`
    };
  })
  .build();
