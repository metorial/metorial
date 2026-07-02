import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDiscussion = SlateTool.create(spec, {
  name: 'Get Discussion',
  key: 'get_discussion',
  description: `Retrieve details of a specific discussion thread by its ID or key. Returns the discussion title, description, group, author, and other metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      discussionId: z
        .union([z.string(), z.number()])
        .describe('ID (integer) or key (string) of the discussion to retrieve')
    })
  )
  .output(
    z.object({
      discussionId: z.number().describe('ID of the discussion'),
      discussionKey: z.string().describe('Key of the discussion'),
      title: z.string().describe('Title of the discussion'),
      description: z.string().optional().describe('Body content of the discussion'),
      descriptionFormat: z
        .string()
        .optional()
        .describe('Format of the description (md or html)'),
      groupId: z.number().optional().describe('ID of the group the discussion belongs to'),
      authorId: z.number().optional().describe('ID of the discussion author'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the discussion was created'),
      lastActivityAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of the last activity'),
      itemsCount: z
        .number()
        .optional()
        .describe('Number of items (comments, etc.) in the discussion'),
      closedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the discussion was closed, if applicable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.getDiscussion(ctx.input.discussionId);
    let discussion = result.discussions?.[0] || result;

    return {
      output: {
        discussionId: discussion.id,
        discussionKey: discussion.key,
        title: discussion.title,
        description: discussion.description,
        descriptionFormat: discussion.description_format,
        groupId: discussion.group_id,
        authorId: discussion.author_id,
        createdAt: discussion.created_at,
        lastActivityAt: discussion.last_activity_at,
        itemsCount: discussion.items_count,
        closedAt: discussion.closed_at
      },
      message: `Retrieved discussion **"${discussion.title}"** (ID: ${discussion.id}).`
    };
  })
  .build();
