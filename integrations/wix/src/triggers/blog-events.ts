import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let blogEvents = SlateTrigger.create(spec, {
  name: 'Blog Events',
  key: 'blog_events',
  description:
    'Triggers on blog events including post created/updated/deleted/published, category and tag changes.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of blog event'),
      eventId: z.string().describe('Unique event identifier'),
      resourceId: z.string().describe('ID of the affected post, category, or tag'),
      payload: z.any().describe('Full event payload')
    })
  )
  .output(
    z.object({
      postId: z.string().optional().describe('Blog post ID'),
      draftPostId: z.string().optional().describe('Draft post ID'),
      categoryId: z.string().optional().describe('Category ID'),
      tagId: z.string().optional().describe('Tag ID'),
      title: z.string().optional().describe('Post or category title'),
      slug: z.string().optional().describe('URL slug'),
      published: z.boolean().optional().describe('Whether the post is published'),
      authorId: z.string().optional().describe('Author member ID'),
      rawPayload: z.any().optional().describe('Complete raw event data')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let eventType = data.eventType || data.type || 'unknown';
      let eventId = data.eventId || `${data.instanceId}-${Date.now()}`;
      let payload = data.data || data;

      let resourceId =
        payload.post?.id ||
        payload.draftPost?.id ||
        payload.category?.id ||
        payload.tag?.id ||
        payload.postId ||
        eventId;

      return {
        inputs: [
          {
            eventType,
            eventId,
            resourceId,
            payload
          }
        ]
      };
    },
    handleEvent: async ctx => {
      let payload = ctx.input.payload;
      let post = payload.post || payload.draftPost || payload;
      let category = payload.category;
      let tag = payload.tag;

      let type = ctx.input.eventType.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '_');
      if (!type.includes('.')) {
        type = `blog.${type}`;
      }

      return {
        type,
        id: ctx.input.eventId,
        output: {
          postId: post?.id || payload.postId,
          draftPostId: payload.draftPost?.id || payload.draftPostId,
          categoryId: category?.id || payload.categoryId,
          tagId: tag?.id || payload.tagId,
          title: post?.title || category?.label || tag?.label,
          slug: post?.slug || category?.slug,
          published: post?.status === 'PUBLISHED' || post?.published,
          authorId: post?.memberId || post?.author?.memberId,
          rawPayload: payload
        }
      };
    }
  })
  .build();
