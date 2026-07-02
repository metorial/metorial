import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPosts = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `List published blog posts from the configured publication with pagination support. Optionally filter by tag slugs. Returns post summaries without full content — use **Get Post** for complete content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().default(10).describe('Number of posts to return (max 20)'),
      after: z
        .string()
        .optional()
        .describe('Cursor for pagination — use the endCursor from a previous response'),
      tagSlugs: z
        .array(z.string())
        .optional()
        .describe('Filter posts by tag slugs, e.g. ["javascript", "react"]')
    })
  )
  .output(
    z.object({
      posts: z
        .array(
          z.object({
            postId: z.string().describe('Unique identifier of the post'),
            title: z.string().describe('Title of the post'),
            slug: z.string().describe('URL slug of the post'),
            url: z.string().describe('Full URL of the post'),
            brief: z.string().nullable().optional().describe('Short excerpt'),
            publishedAt: z
              .string()
              .nullable()
              .optional()
              .describe('ISO timestamp when published'),
            updatedAt: z
              .string()
              .nullable()
              .optional()
              .describe('ISO timestamp when last updated'),
            readTimeInMinutes: z
              .number()
              .nullable()
              .optional()
              .describe('Estimated read time'),
            reactionCount: z.number().nullable().optional().describe('Number of reactions'),
            responseCount: z.number().nullable().optional().describe('Number of responses'),
            coverImageUrl: z.string().nullable().optional().describe('URL of the cover image'),
            authorUsername: z
              .string()
              .nullable()
              .optional()
              .describe('Username of the author'),
            authorName: z
              .string()
              .nullable()
              .optional()
              .describe('Display name of the author'),
            tags: z
              .array(
                z.object({
                  tagId: z.string(),
                  name: z.string(),
                  slug: z.string()
                })
              )
              .optional(),
            seriesName: z.string().nullable().optional()
          })
        )
        .describe('List of posts'),
      hasNextPage: z.boolean().describe('Whether more posts are available'),
      endCursor: z
        .string()
        .nullable()
        .optional()
        .describe('Cursor to use for fetching the next page'),
      totalDocuments: z
        .number()
        .nullable()
        .optional()
        .describe('Total number of posts in the publication')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let result = await client.listPosts({
      first: Math.min(ctx.input.first, 20),
      after: ctx.input.after,
      tagSlugs: ctx.input.tagSlugs
    });

    let posts = result.posts.map((p: any) => ({
      postId: p.id,
      title: p.title,
      slug: p.slug,
      url: p.url,
      brief: p.brief,
      publishedAt: p.publishedAt,
      updatedAt: p.updatedAt,
      readTimeInMinutes: p.readTimeInMinutes,
      reactionCount: p.reactionCount,
      responseCount: p.responseCount,
      coverImageUrl: p.coverImage?.url,
      authorUsername: p.author?.username,
      authorName: p.author?.name,
      tags: (p.tags || []).map((t: any) => ({
        tagId: t.id,
        name: t.name,
        slug: t.slug
      })),
      seriesName: p.series?.name
    }));

    return {
      output: {
        posts,
        hasNextPage: result.pageInfo?.hasNextPage ?? false,
        endCursor: result.pageInfo?.endCursor,
        totalDocuments: result.totalDocuments
      },
      message: `Found **${posts.length}** posts${result.totalDocuments ? ` (${result.totalDocuments} total)` : ''}${result.pageInfo?.hasNextPage ? ' — more available' : ''}`
    };
  })
  .build();
