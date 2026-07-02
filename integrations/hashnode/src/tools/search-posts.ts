import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchPosts = SlateTool.create(spec, {
  name: 'Search Posts',
  key: 'search_posts',
  description: `Search for posts within the configured publication by keyword. Returns matching post summaries with pagination support.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      first: z
        .number()
        .optional()
        .default(10)
        .describe('Number of results to return (max 20)'),
      after: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Post ID'),
            title: z.string().describe('Post title'),
            slug: z.string().describe('URL slug'),
            url: z.string().describe('Full URL'),
            brief: z.string().nullable().optional().describe('Short excerpt'),
            publishedAt: z.string().nullable().optional().describe('Publish date'),
            authorUsername: z.string().nullable().optional(),
            authorName: z.string().nullable().optional(),
            coverImageUrl: z.string().nullable().optional(),
            tags: z
              .array(
                z.object({
                  tagId: z.string(),
                  name: z.string(),
                  slug: z.string()
                })
              )
              .optional()
          })
        )
        .describe('Matching posts'),
      hasNextPage: z.boolean().describe('Whether more results are available'),
      endCursor: z.string().nullable().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let result = await client.searchPosts(ctx.input.query, {
      first: Math.min(ctx.input.first, 20),
      after: ctx.input.after
    });

    let posts = result.posts.map((p: any) => ({
      postId: p.id,
      title: p.title,
      slug: p.slug,
      url: p.url,
      brief: p.brief,
      publishedAt: p.publishedAt,
      authorUsername: p.author?.username,
      authorName: p.author?.name,
      coverImageUrl: p.coverImage?.url,
      tags: (p.tags || []).map((t: any) => ({
        tagId: t.id,
        name: t.name,
        slug: t.slug
      }))
    }));

    return {
      output: {
        posts,
        hasNextPage: result.pageInfo?.hasNextPage ?? false,
        endCursor: result.pageInfo?.endCursor
      },
      message: `Found **${posts.length}** posts matching "${ctx.input.query}"${result.pageInfo?.hasNextPage ? ' — more available' : ''}`
    };
  })
  .build();
