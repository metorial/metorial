import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import type { Post } from '../lib/types';
import { spec } from '../spec';

let formatPost = (post: Post) => ({
  postId: post.id,
  publicationId: post.publication_id,
  title: post.title,
  slug: post.slug,
  description: post.description,
  metaDescription: post.meta_description,
  status: post.status,
  createdAt: post.created_at,
  publishedAt: post.published_at,
  sentAt: post.sent_at,
  thumbnailAlt: post.thumbnail_alt,
  thumbnailUrl: post.thumbnail_url,
  isPaid: post.is_paid,
  publicUrl: post.public_url,
  content: post.content
});

export let managePosts = SlateTool.create(spec, {
  name: 'Manage Posts',
  key: 'manage_posts',
  description:
    'List or retrieve Kit posts, including newsletter/web posts and optional HTML content.',
  instructions: [
    'Use action "list" to retrieve posts. Set includeContent to true only when post body HTML is needed.',
    'Use action "get" with postId to retrieve one post including content.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('Action to perform'),
      postId: z.number().optional().describe('Post ID (required for get)'),
      includeContent: z
        .boolean()
        .optional()
        .describe('For list, include post content in each returned post'),
      perPage: z.number().optional().describe('Results per page for list'),
      cursor: z.string().optional().describe('Pagination cursor for list')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.number(),
            publicationId: z.number(),
            title: z.string(),
            slug: z.string().nullable(),
            description: z.string().nullable(),
            metaDescription: z.string().nullable(),
            status: z.string(),
            createdAt: z.string(),
            publishedAt: z.string().nullable(),
            sentAt: z.string().nullable(),
            thumbnailAlt: z.string().nullable(),
            thumbnailUrl: z.string().nullable(),
            isPaid: z.boolean(),
            publicUrl: z.string().nullable(),
            content: z.string().nullable().optional()
          })
        )
        .optional()
        .describe('Post records for list action'),
      post: z
        .object({
          postId: z.number(),
          publicationId: z.number(),
          title: z.string(),
          slug: z.string().nullable(),
          description: z.string().nullable(),
          metaDescription: z.string().nullable(),
          status: z.string(),
          createdAt: z.string(),
          publishedAt: z.string().nullable(),
          sentAt: z.string().nullable(),
          thumbnailAlt: z.string().nullable(),
          thumbnailUrl: z.string().nullable(),
          isPaid: z.boolean(),
          publicUrl: z.string().nullable(),
          content: z.string().nullable().optional()
        })
        .optional()
        .describe('Post record for get action'),
      hasNextPage: z.boolean().optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);

    if (ctx.input.action === 'list') {
      let result = await client.listPosts({
        includeContent: ctx.input.includeContent,
        perPage: ctx.input.perPage,
        after: ctx.input.cursor
      });
      let posts = result.posts.map(formatPost);
      return {
        output: {
          posts,
          hasNextPage: result.pagination.has_next_page,
          nextCursor: result.pagination.end_cursor
        },
        message: `Found **${posts.length}** post(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
      };
    }

    if (!ctx.input.postId) {
      throw kitServiceError('postId is required for get');
    }

    let post = await client.getPost(ctx.input.postId);
    return {
      output: {
        post: formatPost(post)
      },
      message: `Post **${post.title}** (#${post.id})`
    };
  });
