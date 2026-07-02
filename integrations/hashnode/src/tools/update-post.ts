import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePost = SlateTool.create(spec, {
  name: 'Update Post',
  key: 'update_post',
  description: `Update an existing published blog post. Only the fields you provide will be modified — all other fields remain unchanged. Supports updating content, metadata, tags, cover image, and series assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to update'),
      title: z.string().optional().describe('New title'),
      contentMarkdown: z.string().optional().describe('New Markdown content'),
      subtitle: z.string().optional().describe('New subtitle'),
      slug: z.string().optional().describe('New URL slug'),
      tags: z
        .array(
          z.object({
            tagId: z.string().optional().describe('Existing tag ID'),
            name: z.string().optional().describe('Tag display name'),
            slug: z.string().optional().describe('Tag slug identifier')
          })
        )
        .optional()
        .describe('Replace all tags with these'),
      coverImageUrl: z.string().optional().describe('New cover image URL'),
      canonicalUrl: z.string().optional().describe('New canonical URL'),
      seriesId: z.string().optional().describe('Assign to a series'),
      disableComments: z.boolean().optional().describe('Toggle comments on the post'),
      enableTableOfContent: z.boolean().optional().describe('Toggle table of contents'),
      publishedAt: z.string().optional().describe('Backdate the post publish date (ISO 8601)')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the updated post'),
      title: z.string().describe('Title of the updated post'),
      slug: z.string().describe('URL slug of the updated post'),
      url: z.string().describe('Full URL of the updated post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost: ctx.config.publicationHost
    });

    let tags = ctx.input.tags?.map(t => ({
      id: t.tagId,
      name: t.name,
      slug: t.slug
    }));

    let post = await client.updatePost(ctx.input.postId, {
      title: ctx.input.title,
      contentMarkdown: ctx.input.contentMarkdown,
      subtitle: ctx.input.subtitle,
      slug: ctx.input.slug,
      tags,
      coverImageURL: ctx.input.coverImageUrl,
      originalArticleURL: ctx.input.canonicalUrl,
      seriesId: ctx.input.seriesId,
      disableComments: ctx.input.disableComments,
      enableTableOfContent: ctx.input.enableTableOfContent,
      publishedAt: ctx.input.publishedAt
    });

    return {
      output: {
        postId: post.id,
        title: post.title,
        slug: post.slug,
        url: post.url
      },
      message: `Updated post **"${post.title}"** (${post.url})`
    };
  })
  .build();
