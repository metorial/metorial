import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { invalid, resourceId, validateContentWrite } from '../lib/schemas';
import { spec } from '../spec';

let pageOutputSchema = z
  .object({
    pageId: z.string().describe('Unique page ID'),
    uuid: z.string().optional().describe('Page UUID'),
    title: z.string().optional().describe('Page title'),
    slug: z.string().optional().describe('URL-friendly slug'),
    status: z.string().optional().describe('Page status'),
    visibility: z.string().optional().describe('Page visibility level'),
    lexical: z.string().nullable().optional().describe('Native Lexical document'),
    plaintext: z.string().nullable().optional().describe('Native plain text'),
    html: z.string().nullable().optional().describe('HTML content'),
    excerpt: z.string().nullable().optional().describe('Auto-generated excerpt'),
    customExcerpt: z.string().nullable().optional().describe('Custom excerpt'),
    featureImage: z.string().nullable().optional().describe('Feature image URL'),
    metaTitle: z.string().nullable().optional().describe('SEO meta title'),
    metaDescription: z.string().nullable().optional().describe('SEO meta description'),
    publishedAt: z.string().nullable().optional().describe('Publication timestamp'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    url: z.string().optional().describe('Full URL of the page')
  })
  .partial()
  .required({ pageId: true });

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
      api: z
        .enum(['admin', 'content'])
        .optional()
        .describe(
          'Read through Admin or published Content API. Writes require Admin. Defaults to the connection type.'
        ),
      action: z.enum(['create', 'read', 'update', 'delete']).describe('Operation to perform'),
      pageId: resourceId.optional().describe('Page ID (required for read/update/delete)'),
      slug: resourceId.optional().describe('Page slug (alternative to pageId for reading)'),
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
    let client = getClient(ctx, ctx.input.api);

    let { action } = ctx.input;

    if (action === 'read') {
      let result: any;
      if (ctx.input.slug && ctx.input.pageId)
        throw invalid('Provide one exact ID or slug, not both.');
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
        throw invalid('Either pageId or slug is required for reading a page');
      }
      let p = result.pages[0];
      return { output: mapPage(p), message: `Retrieved page **"${p.title}"** (${p.status}).` };
    }

    if (action === 'delete') {
      if (!ctx.input.pageId) throw invalid('pageId is required for deleting a page');
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

    validateContentWrite(ctx.input);
    let pageData = buildPageData(ctx.input);
    let sourceParams = ctx.input.source ? { source: ctx.input.source } : {};

    if (action === 'create') {
      let result = await client.createPage(pageData, sourceParams);
      let p = result.pages[0];
      return { output: mapPage(p), message: `Created page **"${p.title}"** as ${p.status}.` };
    }

    if (action === 'update') {
      if (!ctx.input.pageId) throw invalid('pageId is required for updating a page');
      if (!ctx.input.updatedAt) throw invalid('updatedAt is required for updating a page');
      pageData.updated_at = ctx.input.updatedAt;
      let result = await client.updatePage(ctx.input.pageId, pageData, sourceParams);
      let p = result.pages[0];
      return { output: mapPage(p), message: `Updated page **"${p.title}"** (${p.status}).` };
    }

    throw invalid(`Unknown action: ${action}`);
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
  lexical: p.lexical,
  plaintext: p.plaintext,
  title: p.title,
  slug: p.slug,
  status: p.status,
  visibility: p.visibility,
  html: p.html,
  excerpt: p.excerpt,
  customExcerpt: p.custom_excerpt,
  featureImage: p.feature_image,
  metaTitle: p.meta_title,
  metaDescription: p.meta_description,
  publishedAt: p.published_at,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
  url: p.url
});
