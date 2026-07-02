import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let postOutputSchema = z.object({
  postId: z.string().describe('Unique post ID'),
  uuid: z.string().describe('Post UUID'),
  title: z.string().describe('Post title'),
  slug: z.string().describe('URL-friendly slug'),
  status: z.string().describe('Post status: draft, published, or scheduled'),
  visibility: z.string().describe('Post visibility level'),
  featured: z.boolean().describe('Whether the post is featured'),
  html: z.string().nullable().optional().describe('HTML content'),
  excerpt: z.string().nullable().describe('Auto-generated excerpt'),
  customExcerpt: z.string().nullable().describe('Custom excerpt'),
  featureImage: z.string().nullable().describe('Feature image URL'),
  metaTitle: z.string().nullable().describe('SEO meta title'),
  metaDescription: z.string().nullable().describe('SEO meta description'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Full URL of the post')
});

export let managePost = SlateTool.create(spec, {
  name: 'Manage Post',
  key: 'manage_post',
  description: `Create, read, update, or delete a post on your Ghost site. Supports creating drafts, publishing, scheduling, and updating content in HTML or Lexical format. Can also fetch a specific post by ID or slug.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide at least a `title`.',
    'For **reading**: set `action` to `"read"` and provide either `postId` or `slug`.',
    'For **updating**: set `action` to `"update"`, provide `postId` and `updatedAt` (required for conflict detection), plus fields to change.',
    'For **deleting**: set `action` to `"delete"` and provide `postId`.',
    'When providing HTML content, set `source` to `"html"` so Ghost converts it to Lexical internally.',
    'Set `status` to `"published"` to publish immediately, `"scheduled"` with a `publishedAt` date to schedule, or omit for draft.',
    'Tags can be provided as names (strings) — non-existent tags will be auto-created.'
  ],
  constraints: [
    'When updating, `updatedAt` is required to prevent overwriting concurrent edits.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Operation to perform'),
      postId: z.string().optional().describe('Post ID (required for read/update/delete)'),
      slug: z.string().optional().describe('Post slug (alternative to postId for reading)'),
      title: z.string().optional().describe('Post title'),
      html: z.string().optional().describe('HTML content for the post'),
      lexical: z.string().optional().describe('Lexical JSON content for the post'),
      status: z.enum(['draft', 'published', 'scheduled']).optional().describe('Post status'),
      visibility: z
        .enum(['public', 'members', 'paid', 'tiers'])
        .optional()
        .describe('Content visibility'),
      featured: z.boolean().optional().describe('Whether the post is featured'),
      featureImage: z.string().optional().describe('Feature image URL'),
      featureImageAlt: z.string().optional().describe('Feature image alt text'),
      featureImageCaption: z.string().optional().describe('Feature image caption'),
      customExcerpt: z.string().optional().describe('Custom excerpt/summary'),
      tags: z.array(z.string()).optional().describe('Tag names to assign to the post'),
      authors: z.array(z.string()).optional().describe('Author emails to assign to the post'),
      publishedAt: z
        .string()
        .optional()
        .describe('Publication date (ISO 8601, required when scheduling)'),
      metaTitle: z.string().optional().describe('SEO meta title'),
      metaDescription: z.string().optional().describe('SEO meta description'),
      canonicalUrl: z.string().optional().describe('Canonical URL for SEO'),
      ogTitle: z.string().optional().describe('OpenGraph title'),
      ogDescription: z.string().optional().describe('OpenGraph description'),
      ogImage: z.string().optional().describe('OpenGraph image URL'),
      twitterTitle: z.string().optional().describe('Twitter card title'),
      twitterDescription: z.string().optional().describe('Twitter card description'),
      twitterImage: z.string().optional().describe('Twitter card image URL'),
      codeinjectionHead: z.string().optional().describe('Code injection for post head'),
      codeinjectionFoot: z.string().optional().describe('Code injection for post footer'),
      updatedAt: z
        .string()
        .optional()
        .describe('Last known updated_at timestamp (required for updates)'),
      source: z.enum(['html']).optional().describe('Set to "html" when providing HTML content')
    })
  )
  .output(postOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'read') {
      let result: any;
      if (ctx.input.slug) {
        result = await client.readPostBySlug(ctx.input.slug, {
          include: 'tags,authors',
          formats: 'html'
        });
      } else if (ctx.input.postId) {
        result = await client.readPost(ctx.input.postId, {
          include: 'tags,authors',
          formats: 'html'
        });
      } else {
        throw new Error('Either postId or slug is required for reading a post');
      }

      let p = result.posts[0];
      return {
        output: mapPost(p),
        message: `Retrieved post **"${p.title}"** (${p.status}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.postId) throw new Error('postId is required for deleting a post');
      await client.deletePost(ctx.input.postId);
      return {
        output: {
          postId: ctx.input.postId,
          uuid: '',
          title: '',
          slug: '',
          status: 'deleted',
          visibility: '',
          featured: false,
          html: null,
          excerpt: null,
          customExcerpt: null,
          featureImage: null,
          metaTitle: null,
          metaDescription: null,
          publishedAt: null,
          createdAt: '',
          updatedAt: '',
          url: ''
        },
        message: `Deleted post \`${ctx.input.postId}\`.`
      };
    }

    let postData = buildPostData(ctx.input);
    let sourceParams = ctx.input.source ? { source: ctx.input.source } : {};

    if (action === 'create') {
      let result = await client.createPost(postData, sourceParams);
      let p = result.posts[0];
      return {
        output: mapPost(p),
        message: `Created post **"${p.title}"** as ${p.status} (ID: \`${p.id}\`).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.postId) throw new Error('postId is required for updating a post');
      if (!ctx.input.updatedAt) throw new Error('updatedAt is required for updating a post');
      postData.updated_at = ctx.input.updatedAt;

      let result = await client.updatePost(ctx.input.postId, postData, sourceParams);
      let p = result.posts[0];
      return {
        output: mapPost(p),
        message: `Updated post **"${p.title}"** (${p.status}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let buildPostData = (input: any): Record<string, any> => {
  let data: Record<string, any> = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.html !== undefined) data.html = input.html;
  if (input.lexical !== undefined) data.lexical = input.lexical;
  if (input.status !== undefined) data.status = input.status;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.featured !== undefined) data.featured = input.featured;
  if (input.featureImage !== undefined) data.feature_image = input.featureImage;
  if (input.featureImageAlt !== undefined) data.feature_image_alt = input.featureImageAlt;
  if (input.featureImageCaption !== undefined)
    data.feature_image_caption = input.featureImageCaption;
  if (input.customExcerpt !== undefined) data.custom_excerpt = input.customExcerpt;
  if (input.publishedAt !== undefined) data.published_at = input.publishedAt;
  if (input.metaTitle !== undefined) data.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) data.meta_description = input.metaDescription;
  if (input.canonicalUrl !== undefined) data.canonical_url = input.canonicalUrl;
  if (input.ogTitle !== undefined) data.og_title = input.ogTitle;
  if (input.ogDescription !== undefined) data.og_description = input.ogDescription;
  if (input.ogImage !== undefined) data.og_image = input.ogImage;
  if (input.twitterTitle !== undefined) data.twitter_title = input.twitterTitle;
  if (input.twitterDescription !== undefined)
    data.twitter_description = input.twitterDescription;
  if (input.twitterImage !== undefined) data.twitter_image = input.twitterImage;
  if (input.codeinjectionHead !== undefined) data.codeinjection_head = input.codeinjectionHead;
  if (input.codeinjectionFoot !== undefined) data.codeinjection_foot = input.codeinjectionFoot;

  if (input.tags) {
    data.tags = input.tags.map((name: string) => ({ name }));
  }
  if (input.authors) {
    data.authors = input.authors.map((email: string) => ({ email }));
  }

  return data;
};

let mapPost = (p: any) => ({
  postId: p.id,
  uuid: p.uuid,
  title: p.title,
  slug: p.slug,
  status: p.status,
  visibility: p.visibility,
  featured: p.featured ?? false,
  html: p.html ?? null,
  excerpt: p.excerpt ?? null,
  customExcerpt: p.custom_excerpt ?? null,
  featureImage: p.feature_image ?? null,
  metaTitle: p.meta_title ?? null,
  metaDescription: p.meta_description ?? null,
  publishedAt: p.published_at ?? null,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  url: p.url
});
