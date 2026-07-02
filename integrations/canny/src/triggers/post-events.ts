import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let postEventsTrigger = SlateTrigger.create(spec, {
  name: 'Post Events',
  key: 'post_events',
  description:
    'Triggers when a post is created, edited, deleted, has its status changed, tags added/removed, or Jira issues linked/unlinked.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of post event'),
      objectId: z.string().describe('Unique event/object identifier'),
      post: z.any().describe('Post object from the webhook payload'),
      tag: z.any().optional().describe('Tag object (for tag events)'),
      jiraIssue: z.any().optional().describe('Jira issue details (for Jira events)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Post ID'),
      title: z.string().describe('Post title'),
      details: z.string().nullable().describe('Post body'),
      status: z.string().describe('Current post status'),
      score: z.number().describe('Vote score'),
      commentCount: z.number().describe('Comment count'),
      authorName: z.string().nullable().describe('Author name'),
      authorId: z.string().nullable().describe('Author ID'),
      boardName: z.string().nullable().describe('Board name'),
      boardId: z.string().nullable().describe('Board ID'),
      url: z.string().describe('Post URL'),
      created: z.string().describe('Creation timestamp'),
      tagName: z.string().nullable().describe('Tag name (for tag events)'),
      tagId: z.string().nullable().describe('Tag ID (for tag events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.type as string;

      if (!eventType?.startsWith('post.')) {
        return { inputs: [] };
      }

      let post = data.object || {};
      let objectId = data.objectID || post.id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            objectId,
            post,
            tag: data.tag,
            jiraIssue: data.jiraIssue
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let post = ctx.input.post || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.objectId,
        output: {
          postId: post.id || '',
          title: post.title || '',
          details: post.details || null,
          status: post.status || '',
          score: post.score || 0,
          commentCount: post.commentCount || 0,
          authorName: post.author?.name || null,
          authorId: post.author?.id || null,
          boardName: post.board?.name || null,
          boardId: post.board?.id || null,
          url: post.url || '',
          created: post.created || '',
          tagName: ctx.input.tag?.name || null,
          tagId: ctx.input.tag?.id || null
        }
      };
    }
  })
  .build();
