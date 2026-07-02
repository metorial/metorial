import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchContent = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search_content',
  description: `Search Confluence content using CQL (Confluence Query Language). CQL supports filtering by type, space, label, creator, date, title, text content, and more.

**Example CQL queries:**
- \`type=page AND space=DEV\` — all pages in the DEV space
- \`text ~ "release notes"\` — content containing "release notes"
- \`label=important AND type=blogpost\` — blog posts with the "important" label
- \`creator=currentUser() AND lastModified > now("-7d")\` — your recent content`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      cql: z.string().describe('Confluence Query Language query string'),
      limit: z.number().optional().default(25).describe('Maximum number of results (max 200)'),
      start: z.number().optional().describe('Offset for pagination'),
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
    let client = createClient(ctx.auth, ctx.config);
    let response = await client.search({
      cql: ctx.input.cql,
      limit: ctx.input.limit,
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
      message: `Found **${results.length}** results for CQL query: \`${ctx.input.cql}\``
    };
  })
  .build();
