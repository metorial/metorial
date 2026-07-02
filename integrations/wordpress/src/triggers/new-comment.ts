import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient, extractCommentSummary } from '../lib/helpers';
import { spec } from '../spec';

export let newCommentTrigger = SlateTrigger.create(spec, {
  name: 'New Comment',
  key: 'new_comment',
  description:
    'Triggers when a new comment is posted on the site. Polls for new comments at regular intervals.'
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the new comment'),
      postId: z.string().describe('ID of the associated post'),
      authorName: z.string().describe('Comment author name'),
      authorEmail: z.string().describe('Comment author email'),
      content: z.string().describe('Comment content'),
      status: z.string().describe('Comment status'),
      date: z.string().describe('Comment date'),
      parentCommentId: z.string().describe('Parent comment ID'),
      type: z.string().describe('Comment type')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the new comment'),
      postId: z.string().describe('ID of the associated post'),
      authorName: z.string().describe('Comment author name'),
      authorEmail: z.string().describe('Comment author email'),
      content: z.string().describe('Comment content'),
      status: z.string().describe('Comment status'),
      date: z.string().describe('Comment date'),
      parentCommentId: z.string().describe('Parent comment ID (0 if top-level)'),
      type: z.string().describe('Comment type')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx.config, ctx.auth);

      let lastCommentId = ctx.state?.lastCommentId as string | undefined;

      let comments = await client.listComments({
        perPage: 50,
        page: 1
      });

      let inputs: any[] = [];
      for (let comment of comments) {
        let summary = extractCommentSummary(comment, ctx.config.apiType);
        if (lastCommentId && Number(summary.commentId) <= Number(lastCommentId)) {
          break;
        }
        inputs.push(summary);
      }

      let newLastCommentId = inputs.length > 0 ? inputs[0]!.commentId : lastCommentId;

      return {
        inputs,
        updatedState: {
          lastCommentId: newLastCommentId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: `comment-${ctx.input.commentId}`,
        output: {
          commentId: ctx.input.commentId,
          postId: ctx.input.postId,
          authorName: ctx.input.authorName,
          authorEmail: ctx.input.authorEmail,
          content: ctx.input.content,
          status: ctx.input.status,
          date: ctx.input.date,
          parentCommentId: ctx.input.parentCommentId,
          type: ctx.input.type
        }
      };
    }
  })
  .build();
