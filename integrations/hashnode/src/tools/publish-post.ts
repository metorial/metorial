import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { selection } from '../lib/schemas';
import { spec } from '../spec';

export let publishPost = SlateTool.create(spec, {
  name: 'Publish Post',
  key: 'publish_post',
  description: `Publish a new blog post to the configured Hashnode publication. Supports Markdown content, tags, cover images, SEO metadata, and optional series assignment. Publication is immediate; publishedAt only backdates a post. Requires Pro and a publishing role. Newsletter sending is unavailable through this mutation.`,
  instructions: [
    'Tags must include at least a "slug" field. Providing "name" is recommended for clarity.',
    'To add the post to a series, provide the seriesId.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      ...selection,
      title: z.string().describe('Title of the blog post'),
      contentMarkdown: z.string().describe('Full post content in Markdown format'),
      subtitle: z.string().optional().describe('Subtitle of the post'),
      slug: z
        .string()
        .optional()
        .describe('Custom URL slug. If not provided, Hashnode generates one from the title'),
      tags: z
        .array(
          z.object({
            tagId: z
              .string()
              .optional()
              .describe(
                'Legacy tag ID, unsupported by current writes. Omit and provide the tag slug.'
              ),
            name: z.string().optional().describe('Tag display name'),
            slug: z.string().optional().describe('Tag slug identifier')
          })
        )
        .optional()
        .describe('Tags to associate with the post'),
      coverImageUrl: z.string().optional().describe('URL of the cover image'),
      canonicalUrl: z
        .string()
        .optional()
        .describe('Canonical URL if cross-posting from another source'),
      seriesId: z.string().optional().describe('ID of the series to add this post to'),
      disableComments: z.boolean().optional().describe('Disable comments on this post'),
      enableTableOfContent: z.boolean().optional().describe('Enable table of contents'),
      sendNewsletter: z
        .boolean()
        .optional()
        .describe(
          'Legacy newsletter delivery flag, unavailable on the current mutation. Omit; use the dashboard for newsletter delivery.'
        ),
      publishedAt: z
        .string()
        .optional()
        .describe('Custom publish date (ISO 8601). Useful for backdating posts')
    })
  )
  .output(
    z.object({
      postId: z.string().describe('ID of the newly published post'),
      title: z.string().describe('Title of the published post'),
      slug: z.string().describe('URL slug of the post'),
      url: z.string().describe('Full URL of the published post')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicationHost:
        ctx.input.publicationHost ??
        (ctx.input.publicationId === undefined ? ctx.config.publicationHost : undefined),
      publicationId: ctx.input.publicationId
    });

    let tags = ctx.input.tags?.map(t => ({
      id: t.tagId,
      name: t.name,
      slug: t.slug
    }));

    let post = await client.publishPost({
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
      isNewsletterActivated: ctx.input.sendNewsletter,
      publishedAt: ctx.input.publishedAt
    });

    return {
      output: {
        postId: post.id,
        title: post.title,
        slug: post.slug,
        url: post.url
      },
      message: `Published post **"${post.title}"** at ${post.url}`
    };
  })
  .build();
