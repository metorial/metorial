import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listHelpdeskArticles = SlateTool.create(spec, {
  name: 'List Helpdesk Articles',
  key: 'list_helpdesk_articles',
  description: `List helpdesk knowledge base articles for a specific locale. Returns paginated article summaries. Use this to browse your knowledge base or find articles to update.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      localeId: z.string().describe('Locale identifier (e.g., "en", "fr", "de")'),
      pageNumber: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      articles: z
        .array(
          z.object({
            articleId: z.string().describe('Article ID'),
            title: z.string().optional().describe('Article title'),
            description: z.string().optional().describe('Article description'),
            featured: z.boolean().optional().describe('Whether the article is featured'),
            order: z.number().optional().describe('Display order'),
            category: z.string().optional().describe('Article category'),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .describe('List of helpdesk articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteId: ctx.config.websiteId,
      tier: ctx.auth.tier
    });
    let results = await client.listHelpdeskArticles(ctx.input.localeId, ctx.input.pageNumber);

    let articles = (results || []).map((a: any) => ({
      articleId: a.article_id,
      title: a.title,
      description: a.description,
      featured: a.featured,
      order: a.order,
      category: a.category,
      createdAt: a.created_at ? String(a.created_at) : undefined,
      updatedAt: a.updated_at ? String(a.updated_at) : undefined
    }));

    return {
      output: { articles },
      message: `Found **${articles.length}** articles for locale "${ctx.input.localeId}" on page ${ctx.input.pageNumber ?? 1}.`
    };
  })
  .build();
