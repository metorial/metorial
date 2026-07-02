import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { kitServiceError } from '../lib/errors';
import { spec } from '../spec';

let postSchema = z.object({
  postId: z.number().describe('Post ID'),
  publicationId: z.number().describe('Publication ID'),
  title: z.string().describe('Post title'),
  slug: z.string().nullable().describe('Post slug'),
  description: z.string().nullable().describe('Post description'),
  metaDescription: z.string().nullable().describe('Post meta description'),
  status: z.string().describe('Post status'),
  createdAt: z.string().describe('Post creation timestamp'),
  publishedAt: z.string().nullable().describe('Published timestamp'),
  sentAt: z.string().nullable().describe('Sent timestamp'),
  thumbnailAlt: z.string().nullable().describe('Thumbnail alt text'),
  thumbnailUrl: z.string().nullable().describe('Thumbnail URL'),
  isPaid: z.boolean().describe('Whether the post is paid'),
  publicUrl: z.string().nullable().describe('Public post URL'),
  content: z.string().nullable().optional().describe('Post HTML content')
});

export let managePosts = SlateTool.create(spec, {
  name: 'Manage Posts',
  key: 'manage_posts',
  description: `List and get Kit posts. Use includeContent when listing only if post bodies are needed.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'get']).describe('The operation to perform'),
      postId: z.number().optional().describe('Post ID (required for get)'),
      includeContent: z
        .boolean()
        .optional()
        .describe('Include post HTML content in list responses'),
      perPage: z.number().optional().describe('Number of results per page (max 1000)'),
      afterCursor: z.string().optional().describe('Pagination cursor to fetch next page'),
      beforeCursor: z.string().optional().describe('Pagination cursor to fetch previous page')
    })
  )
  .output(
    z.object({
      posts: z.array(postSchema).optional().describe('List of posts'),
      post: postSchema.optional().describe('Single post'),
      hasNextPage: z.boolean().optional().describe('Whether more results are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let mapPost = (post: any) => ({
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

    if (ctx.input.action === 'list') {
      let result = await client.listPosts({
        includeContent: ctx.input.includeContent,
        perPage: ctx.input.perPage,
        after: ctx.input.afterCursor,
        before: ctx.input.beforeCursor
      });
      let posts = result.data.map(mapPost);
      return {
        output: {
          posts,
          hasNextPage: result.pagination.has_next_page,
          endCursor: result.pagination.end_cursor
        },
        message: `Found **${posts.length}** posts.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.postId) {
        throw kitServiceError('Post ID is required for get');
      }

      let data = await client.getPost(ctx.input.postId);
      return {
        output: { post: mapPost(data.post) },
        message: `Retrieved post **${data.post.title}**.`
      };
    }

    throw kitServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
