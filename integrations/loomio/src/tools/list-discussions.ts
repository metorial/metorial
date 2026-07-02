import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDiscussions = SlateTool.create(spec, {
  name: 'List Discussions',
  key: 'list_discussions',
  description: `List discussion threads, optionally filtered by group. Returns a summary of each discussion including title, author, activity timestamps, and item counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z.number().optional().describe('Filter discussions by group ID')
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
        .describe('List of discussions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listDiscussions({
      groupId: ctx.input.groupId
    });

    let discussions = (result.discussions || []).map((d: any) => ({
      discussionId: d.id,
      discussionKey: d.key,
      title: d.title,
      groupId: d.group_id,
      authorId: d.author_id,
      createdAt: d.created_at,
      lastActivityAt: d.last_activity_at,
      itemsCount: d.items_count,
      closedAt: d.closed_at
    }));

    return {
      output: { discussions },
      message: `Found **${discussions.length}** discussion(s).`
    };
  })
  .build();
