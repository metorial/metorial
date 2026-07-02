import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPostSummary } from '../lib/helpers';
import { spec } from '../spec';

export let searchContentTool = SlateTool.create(spec, {
  name: 'Search Content',
  key: 'search_content',
  description: `Search across posts and pages on the site by keyword. Returns matching content with titles, excerpts, and URLs. Useful for finding specific content or checking for duplicate topics.`,
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
        .describe('Filter by content type: "post", "page", or a custom post type'),
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
          status: z.string().describe('Content status'),
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
    let client = createClient(ctx.config, ctx.auth);
    let results = await client.search(ctx.input.query, {
      postType: ctx.input.postType,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mapped = results.map((r: any) => {
      let summary = extractPostSummary(r, ctx.config.apiType);
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
