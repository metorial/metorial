import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let postEvents = SlateTrigger.create(spec, {
  name: 'Post Events',
  key: 'post_events',
  description:
    'Triggered when a blog post is published, updated, or deleted in the publication.'
})
  .input(
    z.object({
      eventType: z
        .enum(['post_published', 'post_updated', 'post_deleted'])
        .describe('Type of post event'),
      eventId: z.string().describe('Unique event identifier for deduplication'),
      publicationId: z.string().describe('Publication ID'),
      postId: z.string().describe('Post ID')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the affected post'),
      publicationId: z.string().describe('ID of the publication'),
      title: z
        .string()
        .nullable()
        .optional()
        .describe('Post title (not available for deleted posts)'),
      slug: z.string().nullable().optional().describe('Post URL slug'),
      url: z.string().nullable().optional().describe('Full post URL'),
      brief: z.string().nullable().optional().describe('Post excerpt'),
      publishedAt: z.string().nullable().optional().describe('Publish timestamp'),
      updatedAt: z.string().nullable().optional().describe('Last updated timestamp'),
      contentMarkdown: z
        .string()
        .nullable()
        .optional()
        .describe('Full post content in Markdown'),
      authorUsername: z.string().nullable().optional().describe('Author username'),
      authorName: z.string().nullable().optional().describe('Author display name'),
      tags: z
        .array(
          z.object({
            tagId: z.string(),
            name: z.string(),
            slug: z.string()
          })
        )
        .optional()
        .describe('Post tags')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body?.data?.eventType;
      let postId = body?.data?.post?.id;
      let publicationId = body?.data?.publication?.id;
      let eventId = body?.metadata?.uuid;

      if (!eventType || !postId || !publicationId) {
        return { inputs: [] };
      }

      // Only handle post events
      if (!eventType.startsWith('post_')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: eventId || `${eventType}_${postId}_${Date.now()}`,
            publicationId,
            postId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: any = {
        postId: ctx.input.postId,
        publicationId: ctx.input.publicationId
      };

      // For non-delete events, fetch full post details
      if (ctx.input.eventType !== 'post_deleted') {
        try {
          let client = new Client({
            token: ctx.auth.token,
            publicationHost: ctx.config.publicationHost
          });

          let post = await client.getPost(ctx.input.postId);
          if (post) {
            output.title = post.title;
            output.slug = post.slug;
            output.url = post.url;
            output.brief = post.brief;
            output.publishedAt = post.publishedAt;
            output.updatedAt = post.updatedAt;
            output.contentMarkdown = post.content?.markdown;
            output.authorUsername = post.author?.username;
            output.authorName = post.author?.name;
            output.tags = (post.tags || []).map((t: any) => ({
              tagId: t.id,
              name: t.name,
              slug: t.slug
            }));
          }
        } catch (_e) {
          // Post may not be accessible, return what we have
        }
      }

      return {
        type: `post.${ctx.input.eventType.replace('post_', '')}`,
        id: ctx.input.eventId,
        output
      };
    }
  })
  .build();
