import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentApiClient } from '../lib/client';
import { spec } from '../spec';

let documentSchema = z.object({
  documentId: z.string().describe('Unique document ID'),
  uid: z.string().nullable().describe('User-friendly unique identifier'),
  type: z.string().describe('Document type (custom type)'),
  tags: z.array(z.string()).describe('Tags applied to the document'),
  lang: z.string().describe('Language code of the document'),
  firstPublicationDate: z.string().describe('ISO date of first publication'),
  lastPublicationDate: z.string().describe('ISO date of last publication'),
  url: z.string().nullable().describe('Resolved URL of the document'),
  href: z.string().describe('API URL of the document'),
  slugs: z.array(z.string()).describe('URL slugs for the document'),
  alternateLanguages: z
    .array(
      z.object({
        documentId: z.string(),
        uid: z.string(),
        type: z.string(),
        lang: z.string()
      })
    )
    .describe('Alternate language versions'),
  data: z.record(z.string(), z.any()).describe('Document field data')
});

export let queryDocuments = SlateTool.create(spec, {
  name: 'Query Documents',
  key: 'query_documents',
  description: `Search and retrieve published documents from the Prismic repository using filters, predicates, and sorting.
Supports filtering by document type, tags, full-text search, and custom predicates. Results are paginated.`,
  instructions: [
    'Use the "documentType" field to filter by a specific custom type.',
    'Use "predicates" for advanced queries — each predicate follows Prismic syntax, e.g., \'[:d = at(document.type, "blog_post")]\'.',
    'Set "lang" to "*" to query across all languages.'
  ],
  constraints: [
    'Maximum page size is 100 documents per request.',
    'Only published documents are returned (use a release ref to preview drafts).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentType: z
        .string()
        .optional()
        .describe('Filter by custom type (e.g., "blog_post", "page")'),
      tags: z.array(z.string()).optional().describe('Filter by one or more tags'),
      predicates: z
        .array(z.string())
        .optional()
        .describe('Custom Prismic predicates for advanced filtering'),
      fullTextSearch: z.string().optional().describe('Full-text search query'),
      lang: z
        .string()
        .optional()
        .describe('Language code to filter by (use "*" for all languages)'),
      orderings: z
        .string()
        .optional()
        .describe('Ordering expression, e.g., "[my.blog_post.date desc]"'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 20)'),
      page: z.number().optional().describe('Page number to retrieve (default 1)'),
      after: z
        .string()
        .optional()
        .describe('Document ID to paginate after (for cursor-based pagination)'),
      fetchLinks: z
        .string()
        .optional()
        .describe('Comma-separated list of fields to fetch from linked documents'),
      graphQuery: z
        .string()
        .optional()
        .describe('GraphQuery string for precise field selection'),
      ref: z
        .string()
        .optional()
        .describe('Content ref to query (defaults to master/published ref)')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Current page number'),
      resultsPerPage: z.number().describe('Number of results per page'),
      totalResults: z.number().describe('Total number of matching documents'),
      totalPages: z.number().describe('Total number of pages'),
      nextPage: z.string().nullable().describe('URL for the next page of results'),
      prevPage: z.string().nullable().describe('URL for the previous page of results'),
      documents: z.array(documentSchema).describe('Array of matching documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentApiClient({
      repositoryName: ctx.config.repositoryName,
      accessToken: ctx.auth.token
    });

    let predicates: string[] = [];

    if (ctx.input.documentType) {
      predicates.push(`[:d = at(document.type, "${ctx.input.documentType}")]`);
    }

    if (ctx.input.tags && ctx.input.tags.length > 0) {
      predicates.push(
        `[:d = at(document.tags, [${ctx.input.tags.map(t => `"${t}"`).join(',')}])]`
      );
    }

    if (ctx.input.fullTextSearch) {
      predicates.push(`[:d = fulltext(document, "${ctx.input.fullTextSearch}")]`);
    }

    if (ctx.input.predicates) {
      predicates.push(...ctx.input.predicates);
    }

    let result = await client.queryDocuments({
      predicates: predicates.length > 0 ? predicates : undefined,
      pageSize: ctx.input.pageSize,
      page: ctx.input.page,
      orderings: ctx.input.orderings,
      after: ctx.input.after,
      lang: ctx.input.lang,
      fetchLinks: ctx.input.fetchLinks,
      graphQuery: ctx.input.graphQuery,
      ref: ctx.input.ref
    });

    let documents = result.results.map(doc => ({
      documentId: doc.id,
      uid: doc.uid,
      type: doc.type,
      tags: doc.tags,
      lang: doc.lang,
      firstPublicationDate: doc.first_publication_date,
      lastPublicationDate: doc.last_publication_date,
      url: doc.url,
      href: doc.href,
      slugs: doc.slugs,
      alternateLanguages: doc.alternate_languages.map(al => ({
        documentId: al.id,
        uid: al.uid,
        type: al.type,
        lang: al.lang
      })),
      data: doc.data
    }));

    return {
      output: {
        page: result.page,
        resultsPerPage: result.results_per_page,
        totalResults: result.total_results_size,
        totalPages: result.total_pages,
        nextPage: result.next_page,
        prevPage: result.prev_page,
        documents
      },
      message: `Found **${result.total_results_size}** documents (page ${result.page} of ${result.total_pages}, showing ${result.results_size} results).`
    };
  })
  .build();
