import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listChannels = SlateTool.create(spec, {
  name: 'List Channels',
  key: 'list_channels',
  description: `List feedback channels in the workspace, or retrieve a specific channel with its topics by ID. Channels aggregate feedback from different sources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      channelId: z
        .string()
        .optional()
        .describe(
          'Retrieve a specific channel by ID (includes topics). If omitted, lists all channels.'
        ),
      folderId: z.string().optional().describe('Filter by folder ID'),
      sort: z.enum(['created_at:asc', 'created_at:desc']).optional().describe('Sort order'),
      limit: z.number().optional().describe('Max results per page (1-100, default 100)'),
      startCursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      channels: z.array(
        z.object({
          channelId: z.string(),
          title: z.string(),
          createdAt: z.string(),
          folderId: z.string().nullable().optional(),
          topics: z
            .array(
              z.object({
                topicId: z.string(),
                title: z.string(),
                description: z.string()
              })
            )
            .optional()
        })
      ),
      totalCount: z.number().optional(),
      hasMore: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.channelId) {
      let channel = await client.getChannel(ctx.input.channelId);
      return {
        output: {
          channels: [
            {
              channelId: channel.id,
              title: channel.title,
              createdAt: channel.created_at,
              folderId: channel.folder?.id ?? null,
              topics: (channel.topics || []).map(t => ({
                topicId: t.id,
                title: t.title,
                description: t.description
              }))
            }
          ]
        },
        message: `Retrieved channel **${channel.title}** with ${(channel.topics || []).length} topics.`
      };
    }

    let result = await client.listChannels({
      folderId: ctx.input.folderId,
      sort: ctx.input.sort,
      limit: ctx.input.limit,
      startCursor: ctx.input.startCursor
    });

    let channels = result.data.map(c => ({
      channelId: c.id,
      title: c.title,
      createdAt: c.created_at,
      folderId: c.folder?.id ?? null
    }));

    return {
      output: {
        channels,
        totalCount: result.page.total_count,
        hasMore: result.page.has_more,
        nextCursor: result.page.next_cursor
      },
      message: `Found **${result.page.total_count}** channels. Returned **${channels.length}** in this page.`
    };
  })
  .build();
