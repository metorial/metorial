import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List stories (comments and activity) on a task. Returns the full activity feed including comments, status changes, and system updates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID'),
      limit: z.number().optional().describe('Maximum number of stories to return')
    })
  )
  .output(
    z.object({
      stories: z.array(
        z.object({
          storyId: z.string(),
          createdAt: z.string().optional(),
          createdBy: z.any().optional(),
          resourceSubtype: z.string().optional(),
          text: z.string().optional(),
          htmlText: z.string().optional(),
          type: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listStories(ctx.input.taskId, { limit: ctx.input.limit });
    let stories = (result.data || []).map((s: any) => ({
      storyId: s.gid,
      createdAt: s.created_at,
      createdBy: s.created_by,
      resourceSubtype: s.resource_subtype,
      text: s.text,
      htmlText: s.html_text,
      type: s.type
    }));

    return {
      output: { stories },
      message: `Found **${stories.length}** story/stories on the task.`
    };
  })
  .build();

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a task. Optionally pin the comment to the task.`
})
  .input(
    z.object({
      taskId: z.string().describe('Task GID to comment on'),
      text: z.string().describe('Comment text'),
      isPinned: z.boolean().optional().describe('Pin the comment to the task')
    })
  )
  .output(
    z.object({
      storyId: z.string(),
      createdAt: z.string().optional(),
      text: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let story = await client.createStory(ctx.input.taskId, ctx.input.text, ctx.input.isPinned);

    return {
      output: {
        storyId: story.gid,
        createdAt: story.created_at,
        text: story.text
      },
      message: `Added comment to task (story ${story.gid}).`
    };
  })
  .build();
