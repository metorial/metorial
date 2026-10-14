import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { groupIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let listDiscussions = SlateTool.create(spec, {
  name: 'List Discussions',
  key: 'list_discussions',
  description: `List discussion threads in a group. Call list_groups to discover group IDs; groupId is required by Loomio. Returns a summary of each discussion including title, author, activity timestamps, and item counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: groupIdSchema.optional(),
      status: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by status. Default: open.'),
      limit: z.number().int().min(1).optional().describe('Page size. Default: 50.'),
      offset: z.number().int().min(0).optional().describe('Offset for pagination. Default: 0.')
    })
  )
  .output(
    z.object({
      discussions: z
        .array(
          z.object({
            discussionId: z.number().describe('ID of the discussion'),
            discussionKey: z.string().describe('Key of the discussion'),
            title: z.string().describe('Title of the discussion'),
            groupId: z.number().optional().describe('ID of the group'),
            authorId: z.number().optional().describe('ID of the author'),
            createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
            lastActivityAt: z.string().optional().describe('ISO 8601 last activity timestamp'),
            itemsCount: z.number().optional().describe('Number of items in the discussion'),
            closedAt: z.string().optional().describe('ISO 8601 closed timestamp')
          })
        )
        .describe('List of discussions'),
      total: z
        .number()
        .optional()
        .describe('Total records before pagination, when supplied by Loomio')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listDiscussions({
      groupId: ctx.input.groupId,
      status: ctx.input.status,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let discussions = result.discussions.map(d => ({
      discussionId: d.id,
      discussionKey: d.key,
      title: d.title,
      groupId: d.group_id ?? undefined,
      authorId: d.author_id ?? undefined,
      createdAt: d.created_at ?? undefined,
      lastActivityAt: d.last_activity_at ?? undefined,
      itemsCount: d.items_count ?? undefined,
      closedAt: d.closed_at ?? undefined
    }));

    return {
      output: { discussions, total: result.meta?.total },
      message: `Found **${discussions.length}** discussion(s).`
    };
  })
  .build();
