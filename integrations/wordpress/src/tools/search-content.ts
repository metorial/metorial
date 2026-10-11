import { SlateTool } from 'slates';
import { z } from 'zod';
import { apiTypeFor, createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

export let searchContentTool = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search_content',
  description: `Search across posts and pages on the site by keyword. Returns matching content with titles and URLs (plus status, excerpt, and date on WordPress.com sites). Useful for finding specific content or checking for duplicate topics.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query string'),
      postType: z
        .string()
        .optional()
        .describe(
          'Filter by content type: "post", "page", or a custom post type. Defaults to both posts and pages.'
        ),
      perPage: z.number().optional().describe('Number of results per page (default: 20)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          postId: z.string().describe('Content ID'),
          title: z.string().describe('Content title'),
          status: z
            .string()
            .describe(
              'Content status (empty for self-hosted sites, which only return published content)'
            ),
          url: z.string().describe('Public URL'),
          slug: z.string().describe('URL slug'),
          excerpt: z.string().describe('Content excerpt'),
          date: z.string().describe('Publication date'),
          type: z.string().describe('Content type (post, page, etc.)')
        })
      ),
      count: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let results = await client.search(ctx.input.query, {
      postType: ctx.input.postType,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mapped = results.map((r: any) => {
      if (apiTypeFor(ctx.auth) === 'selfhosted') {
        // wp/v2/search returns id, title, url, type ("post") and subtype (post type).
        return {
          postId: String(r.id ?? ''),
          title: typeof r.title === 'string' ? r.title : r.title?.rendered || '',
          status: '',
          url: r.url || r.link || '',
          slug: r.slug || '',
          excerpt: '',
          date: '',
          type: r.subtype || r.type || ''
        };
      }

      let summary = extractPostSummary(r, apiTypeFor(ctx.auth));
      return {
        postId: summary.postId,
        title: summary.title,
        status: summary.status,
        url: summary.url,
        slug: summary.slug,
        excerpt: summary.excerpt,
        date: summary.date,
        type: summary.type
      };
    });

    return {
      output: {
        results: mapped,
        count: mapped.length
      },
      message: `Found **${mapped.length}** result(s) for "${ctx.input.query}".`
    };
  })
  .build();
