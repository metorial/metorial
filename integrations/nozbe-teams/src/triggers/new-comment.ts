import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client, type ListParams } from '../lib/client';
import { spec } from '../spec';

export let newCommentTrigger = SlateTrigger.create(spec, {
  name: 'New Comment',
  key: 'new_comment',
  description: 'Triggers when a new comment is added to a task in Nozbe Teams.'
})
  .input(
    z.object({
      commentId: z.string().describe('Comment ID'),
      body: z.string().describe('Comment body in Markdown'),
      taskId: z.string().describe('Task ID the comment belongs to'),
      authorId: z.string().describe('Author user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      isPinned: z.boolean().optional().describe('Whether the comment is pinned')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Comment ID'),
      body: z.string().describe('Comment body in Markdown'),
      taskId: z.string().describe('Task ID'),
      authorId: z.string().describe('Author user ID'),
      createdAt: z.number().optional().describe('Creation timestamp'),
      isPinned: z.boolean().optional().describe('Whether the comment is pinned')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let params: ListParams = {
        sortBy: '-created_at',
        limit: 50
      };

      let lastPollTimestamp = ctx.state?.lastPollTimestamp as number | undefined;
      if (lastPollTimestamp) {
        params['created_at[min]'] = lastPollTimestamp + 1;
      }

      let comments = await client.listComments(params);

      let newTimestamp = lastPollTimestamp;
      if (comments.length > 0) {
        newTimestamp = Math.max(...comments.map((c: any) => c.created_at || 0));
      }

      return {
        inputs: comments.map((c: any) => ({
          commentId: c.id,
          body: c.body,
          taskId: c.task_id,
          authorId: c.author_id,
          createdAt: c.created_at,
          isPinned: c.is_pinned
        })),
        updatedState: {
          lastPollTimestamp: newTimestamp ?? Date.now()
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: ctx.input.commentId,
        output: {
          commentId: ctx.input.commentId,
          body: ctx.input.body,
          taskId: ctx.input.taskId,
          authorId: ctx.input.authorId,
          createdAt: ctx.input.createdAt,
          isPinned: ctx.input.isPinned
        }
      };
    }
  })
  .build();
