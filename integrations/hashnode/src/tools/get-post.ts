import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPost = SlateTool.create(spec, {
  name: 'Get Post',
  key: 'get_post',
  description: `Retrieve a single blog post with its full content, metadata, and author information. Look up by post ID or by URL slug within the configured publication.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().optional().describe('The ID of the post to retrieve'),
      slug: z
        .string()
        .optional()
        .describe('The URL slug of the post to retrieve (used if postId is not provided)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('Unique identifier of the post'),
      title: z.string().describe('Title of the post'),
      subtitle: z.string().nullable().optional().describe('Subtitle of the post'),
      slug: z.string().describe('URL slug of the post'),
      url: z.string().describe('Full URL of the post'),
      brief: z.string().nullable().optional().describe('Short excerpt of the post'),
      publishedAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO timestamp when the post was published'),
      updatedAt: z
        .string()
        .nullable()
        .optional()
        .describe('ISO timestamp when the post was last updated'),
      readTimeInMinutes: z
        .number()
        .nullable()
        .optional()
        .describe('Estimated read time in minutes'),
      reactionCount: z
        .number()
        .nullable()
        .optional()
        .describe('Number of reactions on the post'),
      responseCount: z.number().nullable().optional().describe('Number of comments/responses'),
      contentMarkdown: z
        .string()
        .nullable()
        .optional()
        .describe('Full post content in Markdown'),
      contentHtml: z.string().nullable().optional().describe('Full post content in HTML'),
      coverImageUrl: z.string().nullable().optional().describe('URL of the cover image'),
      authorId: z.string().nullable().optional().describe('ID of the post author'),
      authorUsername: z.string().nullable().optional().describe('Username of the post author'),
      authorName: z.string().nullable().optional().describe('Display name of the post author'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().describe('Tag name'),
            slug: z.string().describe('Tag slug')
          })
        )
        .optional()
        .describe('Tags associated with the post'),
      seriesId: z
        .string()
        .nullable()
        .optional()
        .describe('ID of the series this post belongs to'),
      seriesName: z
        .string()
        .nullable()
        .optional()
        .describe('Name of the series this post belongs to'),
      seoTitle: z.string().nullable().optional().describe('SEO title'),
      seoDescription: z.string().nullable().optional().describe('SEO description')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.postId && !ctx.input.slug) {
      throw new Error('Either postId or slug must be provided');
    }

    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let post: any;
    if (ctx.input.postId) {
      post = await client.getPost(ctx.input.postId);
    } else {
      post = await client.getPostBySlug(ctx.input.slug!);
    }

    if (!post) {
      throw new Error(`Post not found`);
    }

    return {
      output: {
        postId: post.id,
        title: post.title,
        subtitle: post.subtitle,
        slug: post.slug,
        url: post.url,
        brief: post.brief,
        publishedAt: post.publishedAt,
        updatedAt: post.updatedAt,
        readTimeInMinutes: post.readTimeInMinutes,
        reactionCount: post.reactionCount,
        responseCount: post.responseCount,
        contentMarkdown: post.content?.markdown,
        contentHtml: post.content?.html,
        coverImageUrl: post.coverImage?.url,
        authorId: post.author?.id,
        authorUsername: post.author?.username,
        authorName: post.author?.name,
        tags: (post.tags || []).map((t: any) => ({
          tagId: t.id,
          name: t.name,
          slug: t.slug
        })),
        seriesId: post.series?.id,
        seriesName: post.series?.name,
        seoTitle: post.seo?.title,
        seoDescription: post.seo?.description
      },
      message: `Retrieved post **"${post.title}"** (${post.url})`
    };
  })
  .build();
