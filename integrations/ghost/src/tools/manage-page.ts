import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let pageOutputSchema = z.object({
  pageId: z.string().describe('Unique page ID'),
  uuid: z.string().describe('Page UUID'),
  title: z.string().describe('Page title'),
  slug: z.string().describe('URL-friendly slug'),
  status: z.string().describe('Page status'),
  visibility: z.string().describe('Page visibility level'),
  html: z.string().nullable().optional().describe('HTML content'),
  excerpt: z.string().nullable().describe('Auto-generated excerpt'),
  customExcerpt: z.string().nullable().describe('Custom excerpt'),
  featureImage: z.string().nullable().describe('Feature image URL'),
  metaTitle: z.string().nullable().describe('SEO meta title'),
  metaDescription: z.string().nullable().describe('SEO meta description'),
  publishedAt: z.string().nullable().describe('Publication timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('Full URL of the page')
});

export let managePage = SlateTool.create(spec, {
  name: 'Manage Page',
  key: 'manage_page',
  description: `Create, read, update, or delete a static page on your Ghost site. Pages are standalone content separate from the blog post feed, commonly used for About, Contact, or other permanent pages.`,
  instructions: [
    'For **creating**: set `action` to `"create"` and provide at least a `title`.',
    'For **reading**: set `action` to `"read"` and provide either `pageId` or `slug`.',
    'For **updating**: set `action` to `"update"`, provide `pageId` and `updatedAt`, plus fields to change.',
    'For **deleting**: set `action` to `"delete"` and provide `pageId`.',
    'When providing HTML content, set `source` to `"html"`.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Operation to perform'),
      pageId: z.string().optional().describe('Page ID (required for read/update/delete)'),
      slug: z.string().optional().describe('Page slug (alternative to pageId for reading)'),
      title: z.string().optional().describe('Page title'),
      html: z.string().optional().describe('HTML content'),
      lexical: z.string().optional().describe('Lexical JSON content'),
      status: z.enum(['draft', 'published', 'scheduled']).optional().describe('Page status'),
      visibility: z
        .enum(['public', 'members', 'paid', 'tiers'])
        .optional()
        .describe('Content visibility'),
      featureImage: z.string().optional().describe('Feature image URL'),
      customExcerpt: z.string().optional().describe('Custom excerpt/summary'),
      tags: z.array(z.string()).optional().describe('Tag names to assign'),
      authors: z.array(z.string()).optional().describe('Author emails to assign'),
      publishedAt: z.string().optional().describe('Publication date (ISO 8601)'),
      metaTitle: z.string().optional().describe('SEO meta title'),
      metaDescription: z.string().optional().describe('SEO meta description'),
      canonicalUrl: z.string().optional().describe('Canonical URL'),
      updatedAt: z
        .string()
        .optional()
        .describe('Last known updated_at timestamp (required for updates)'),
      source: z.enum(['html']).optional().describe('Set to "html" when providing HTML content')
    })
  )
  .output(pageOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let { action } = ctx.input;

    if (action === 'read') {
      let result: any;
      if (ctx.input.slug) {
        result = await client.readPageBySlug(ctx.input.slug, {
          include: 'tags,authors',
          formats: 'html'
        });
      } else if (ctx.input.pageId) {
        result = await client.readPage(ctx.input.pageId, {
          include: 'tags,authors',
          formats: 'html'
        });
      } else {
        throw new Error('Either pageId or slug is required for reading a page');
      }
      let p = result.pages[0];
      return { output: mapPage(p), message: `Retrieved page **"${p.title}"** (${p.status}).` };
    }

    if (action === 'delete') {
      if (!ctx.input.pageId) throw new Error('pageId is required for deleting a page');
      await client.deletePage(ctx.input.pageId);
      return {
        output: {
          pageId: ctx.input.pageId,
          uuid: '',
          title: '',
          slug: '',
          status: 'deleted',
          visibility: '',
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
        message: `Deleted page \`${ctx.input.pageId}\`.`
      };
    }

    let pageData = buildPageData(ctx.input);
    let sourceParams = ctx.input.source ? { source: ctx.input.source } : {};

    if (action === 'create') {
      let result = await client.createPage(pageData, sourceParams);
      let p = result.pages[0];
      return { output: mapPage(p), message: `Created page **"${p.title}"** as ${p.status}.` };
    }

    if (action === 'update') {
      if (!ctx.input.pageId) throw new Error('pageId is required for updating a page');
      if (!ctx.input.updatedAt) throw new Error('updatedAt is required for updating a page');
      pageData.updated_at = ctx.input.updatedAt;
      let result = await client.updatePage(ctx.input.pageId, pageData, sourceParams);
      let p = result.pages[0];
      return { output: mapPage(p), message: `Updated page **"${p.title}"** (${p.status}).` };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();

let buildPageData = (input: any): Record<string, any> => {
  let data: Record<string, any> = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.html !== undefined) data.html = input.html;
  if (input.lexical !== undefined) data.lexical = input.lexical;
  if (input.status !== undefined) data.status = input.status;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.featureImage !== undefined) data.feature_image = input.featureImage;
  if (input.customExcerpt !== undefined) data.custom_excerpt = input.customExcerpt;
  if (input.publishedAt !== undefined) data.published_at = input.publishedAt;
  if (input.metaTitle !== undefined) data.meta_title = input.metaTitle;
  if (input.metaDescription !== undefined) data.meta_description = input.metaDescription;
  if (input.canonicalUrl !== undefined) data.canonical_url = input.canonicalUrl;
  if (input.tags) data.tags = input.tags.map((name: string) => ({ name }));
  if (input.authors) data.authors = input.authors.map((email: string) => ({ email }));
  return data;
};

let mapPage = (p: any) => ({
  pageId: p.id,
  uuid: p.uuid,
  title: p.title,
  slug: p.slug,
  status: p.status,
  visibility: p.visibility,
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
