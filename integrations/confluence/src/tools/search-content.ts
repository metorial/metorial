import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { confluenceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

type SearchContentInput = {
  cql?: string;
  query?: string;
};

let quoteCqlTextSearch = (query: string) =>
  `text ~ "${query.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

export let resolveSearchContentQuery = (input: SearchContentInput) => {
  let cql = input.cql?.trim();
  let query = input.query?.trim();

  if (cql && query) {
    throw confluenceServiceError('Provide either cql or query, not both.');
  }

  if (cql) {
    return {
      cql,
      label: `CQL query: \`${cql}\``
    };
  }

  if (query) {
    return {
      cql: quoteCqlTextSearch(query),
      label: `query: \`${query}\``
    };
  }

  throw confluenceServiceError(
    'Either cql or query is required to search Confluence content.'
  );
};

export let searchContent = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search_content',
  description: `Search Confluence content. Use query for plain-text searches, or cql for advanced Confluence Query Language filters. CQL supports filtering by type, space, label, creator, date, title, text content, and more.

**Example CQL queries:**
- \`type=page AND space=DEV\` — all pages in the DEV space
- \`text ~ "release notes"\` — content containing "release notes"
- \`label=important AND type=blogpost\` — blog posts with the "important" label
- \`creator=currentUser() AND lastModified > now("-7d")\` — your recent content`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Plain-text search terms. The tool converts this to a Confluence CQL text search. Provide either query or cql, not both.'
        ),
      cql: z
        .string()
        .optional()
        .describe(
          'Advanced Confluence Query Language query string. Provide either cql or query, not both.'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of results (max 200)'),
      start: z.number().int().min(0).optional().describe('Offset for pagination'),
      includeArchivedSpaces: z
        .boolean()
        .optional()
        .describe('Include results from archived spaces')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          contentId: z.string().optional(),
          contentType: z.string().optional(),
          title: z.string().optional(),
          spaceKey: z.string().optional(),
          spaceName: z.string().optional(),
          excerpt: z.string().optional(),
          webUrl: z.string().optional()
        })
      ),
      totalSize: z.number().optional(),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let searchQuery = resolveSearchContentQuery(ctx.input);
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.search({
      cql: searchQuery.cql,
      limit: ctx.input.limit ?? 25,
      start: ctx.input.start,
      includeArchivedSpaces: ctx.input.includeArchivedSpaces
    });

    let results = response.results.map(r => ({
      contentId: r.content?.id,
      contentType: r.content?.type,
      title: r.title || r.content?.title,
      spaceKey: r.content?.space?.key,
      spaceName: r.content?.space?.name,
      excerpt: r.excerpt,
      webUrl: r.url || r.content?._links?.webui
    }));

    let hasMore = !!response._links?.next;

    return {
      output: {
        results,
        totalSize: response.size,
        hasMore
      },
      message: `Found **${results.length}** results for ${searchQuery.label}`
    };
  })
  .build();
