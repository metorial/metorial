import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let articleOutputSchema = z.object({
  articleId: z.string().describe('The article ID'),
  title: z.string().describe('The article title'),
  body: z.string().nullable().describe('The article body (HTML)'),
  locale: z.string().describe('The article locale'),
  sectionId: z.string().nullable().describe('The section ID the article belongs to'),
  authorId: z.string().nullable().describe('The author user ID'),
  draft: z.boolean().describe('Whether the article is a draft'),
  promoted: z.boolean().describe('Whether the article is promoted'),
  position: z.number().nullable().describe('The article position in the section'),
  labelNames: z.array(z.string()).describe('Labels on the article'),
  htmlUrl: z.string().nullable().describe('The public URL of the article'),
  createdAt: z.string().describe('When the article was created'),
  updatedAt: z.string().describe('When the article was last updated')
});

let mapArticle = (a: any) => ({
  articleId: String(a.id),
  title: a.title,
  body: a.body || null,
  locale: a.locale,
  sectionId: a.section_id ? String(a.section_id) : null,
  authorId: a.author_id ? String(a.author_id) : null,
  draft: a.draft || false,
  promoted: a.promoted || false,
  position: a.position ?? null,
  labelNames: a.label_names || [],
  htmlUrl: a.html_url || null,
  createdAt: a.created_at,
  updatedAt: a.updated_at
});

export let listArticles = SlateTool.create(spec, {
  name: 'List Articles',
  key: 'list_articles',
  description: `Lists knowledge base articles from the Zendesk Help Center. Supports sorting and locale filtering.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().default(1).describe('Page number'),
      perPage: z.number().optional().default(25).describe('Results per page (max 100)'),
      sortBy: z
        .enum(['created_at', 'updated_at', 'title', 'position'])
        .optional()
        .describe('Sort field'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      locale: z.string().optional().describe('Locale to filter articles (e.g., "en-us")')
    })
  )
  .output(
    z.object({
      articles: z.array(articleOutputSchema),
      count: z.number(),
      nextPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.listArticles({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortBy: ctx.input.sortBy,
      sortOrder: ctx.input.sortOrder,
      locale: ctx.input.locale
    });

    let articles = (data.articles || []).map(mapArticle);

    return {
      output: {
        articles,
        count: data.count || articles.length,
        nextPage: data.next_page || null
      },
      message: `Found ${data.count || articles.length} article(s), showing ${articles.length} on this page.`
    };
  })
  .build();

export let getArticle = SlateTool.create(spec, {
  name: 'Get Article',
  key: 'get_article',
  description: `Retrieves a single Help Center article by its ID, including the full body content, labels, and metadata. Optionally retrieves a specific locale translation.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      articleId: z.string().describe('The article ID to retrieve'),
      locale: z.string().optional().describe('Specific locale to retrieve (e.g., "en-us")')
    })
  )
  .output(articleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let article = await client.getArticle(ctx.input.articleId, ctx.input.locale);

    return {
      output: mapArticle(article),
      message: `Article: **${article.title}** (ID: ${article.id}, Locale: ${article.locale})`
    };
  })
  .build();

export let createArticle = SlateTool.create(spec, {
  name: 'Create Article',
  key: 'create_article',
  description: `Creates a new Help Center article in a specified section. The article body supports HTML formatting.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sectionId: z.string().describe('The section ID to create the article in'),
      title: z.string().describe('The article title'),
      body: z.string().describe('The article body (HTML supported)'),
      locale: z.string().optional().describe('Locale for the article (e.g., "en-us")'),
      draft: z.boolean().optional().default(false).describe('Whether to create as a draft'),
      promoted: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to promote the article'),
      labelNames: z.array(z.string()).optional().describe('Labels to apply'),
      position: z.number().optional().describe('Position in the section'),
      authorId: z.string().optional().describe('Author user ID')
    })
  )
  .output(articleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let articleData: Record<string, any> = {
      title: ctx.input.title,
      body: ctx.input.body
    };

    if (ctx.input.locale) articleData.locale = ctx.input.locale;
    if (ctx.input.draft !== undefined) articleData.draft = ctx.input.draft;
    if (ctx.input.promoted !== undefined) articleData.promoted = ctx.input.promoted;
    if (ctx.input.labelNames) articleData.label_names = ctx.input.labelNames;
    if (ctx.input.position !== undefined) articleData.position = ctx.input.position;
    if (ctx.input.authorId) articleData.author_id = ctx.input.authorId;

    let article = await client.createArticle(ctx.input.sectionId, articleData);

    return {
      output: mapArticle(article),
      message: `Created article **${article.title}** (ID: ${article.id}) in section ${ctx.input.sectionId}`
    };
  })
  .build();

export let updateArticle = SlateTool.create(spec, {
  name: 'Update Article',
  key: 'update_article',
  description: `Updates an existing Help Center article. Can modify title, body, draft status, labels, and promotion status.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      articleId: z.string().describe('The article ID to update'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New body content (HTML)'),
      draft: z.boolean().optional().describe('Whether the article should be a draft'),
      promoted: z.boolean().optional().describe('Whether to promote the article'),
      labelNames: z.array(z.string()).optional().describe('Replace all labels'),
      position: z.number().optional().describe('New position in the section')
    })
  )
  .output(articleOutputSchema)
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let articleData: Record<string, any> = {};
    if (ctx.input.title !== undefined) articleData.title = ctx.input.title;
    if (ctx.input.body !== undefined) articleData.body = ctx.input.body;
    if (ctx.input.draft !== undefined) articleData.draft = ctx.input.draft;
    if (ctx.input.promoted !== undefined) articleData.promoted = ctx.input.promoted;
    if (ctx.input.labelNames !== undefined) articleData.label_names = ctx.input.labelNames;
    if (ctx.input.position !== undefined) articleData.position = ctx.input.position;

    let article = await client.updateArticle(ctx.input.articleId, articleData);

    return {
      output: mapArticle(article),
      message: `Updated article **${article.title}** (ID: ${article.id})`
    };
  })
  .build();

export let deleteArticle = SlateTool.create(spec, {
  name: 'Delete Article',
  key: 'delete_article',
  description: `Permanently deletes a Help Center article. This action cannot be undone.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      articleId: z.string().describe('The article ID to delete')
    })
  )
  .output(
    z.object({
      articleId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    await client.deleteArticle(ctx.input.articleId);

    return {
      output: {
        articleId: ctx.input.articleId,
        deleted: true
      },
      message: `Deleted article **#${ctx.input.articleId}**`
    };
  })
  .build();
