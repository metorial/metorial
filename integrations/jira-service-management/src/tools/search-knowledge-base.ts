import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let searchKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Search Knowledge Base',
  key: 'search_knowledge_base',
  description: `Search knowledge base articles linked to a service desk. Articles are sourced from linked Confluence spaces. Useful for finding existing documentation or solutions before creating new requests.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceDeskId: z.string().describe('ID of the service desk to search within'),
      query: z.string().describe('Search query text'),
      highlight: z
        .boolean()
        .optional()
        .describe('Whether to include text highlights in results'),
      start: z.number().optional().describe('Pagination start index'),
      limit: z.number().optional().describe('Maximum number of results')
    })
  )
  .output(
    z.object({
      articles: z
        .array(
          z.object({
            title: z.string().describe('Article title'),
            excerpt: z.string().optional().describe('Article excerpt or highlighted snippet'),
            sourceType: z.string().optional().describe('Source type (e.g., "confluence")'),
            sourceUrl: z.string().optional().describe('URL to the source article')
          })
        )
        .describe('Matching knowledge base articles'),
      total: z.number().describe('Total number of matching articles')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.searchKnowledgeBase(
      ctx.input.serviceDeskId,
      ctx.input.query,
      ctx.input.highlight,
      ctx.input.start,
      ctx.input.limit
    );

    let articles = (result.values || []).map((article: any) => ({
      title: article.title,
      excerpt: article.excerpt,
      sourceType: article.source?.type,
      sourceUrl: article.source?.pageUrl
    }));

    return {
      output: {
        articles,
        total: result.size || articles.length
      },
      message: `Found **${articles.length}** knowledge base articles matching "${ctx.input.query}".`
    };
  })
  .build();
