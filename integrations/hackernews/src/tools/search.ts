import { SlateTool } from 'slates';
import { z } from 'zod';
import { SearchClient } from '../lib/search-client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search',
  key: 'search',
  description: `Full-text search across Hacker News content powered by Algolia. Search stories, comments, Ask HN, Show HN, and jobs.
Supports filtering by content type, author, date range, and minimum points. Results can be sorted by relevance or date.`,
  instructions: [
    'Use **sortBy: "date"** to get the most recent results first.',
    'Combine **contentType** and **author** filters to narrow results.',
    'Use **minPoints** to filter for high-quality content.',
    'Date ranges use ISO 8601 format (e.g., "2024-01-01T00:00:00Z").'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Search query text. Leave empty to browse by filters only.'),
      sortBy: z
        .enum(['relevance', 'date'])
        .optional()
        .default('relevance')
        .describe('Sort order: relevance (default) or date (newest first)'),
      contentType: z
        .enum(['story', 'comment', 'ask_hn', 'show_hn', 'job'])
        .optional()
        .describe('Filter by content type'),
      author: z.string().optional().describe('Filter by author username'),
      storyId: z.number().optional().describe('Filter comments by parent story ID'),
      minPoints: z.number().optional().describe('Minimum points/score threshold'),
      dateFrom: z.string().optional().describe('Start of date range (ISO 8601 timestamp)'),
      dateTo: z.string().optional().describe('End of date range (ISO 8601 timestamp)'),
      hitsPerPage: z
        .number()
        .optional()
        .default(20)
        .describe('Number of results per page (default: 20, max: 1000)'),
      page: z.number().optional().default(0).describe('Page number for pagination (0-based)')
    })
  )
  .output(
    z.object({
      totalHits: z.number().describe('Total number of matching results'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      hits: z
        .array(
          z.object({
            objectId: z.string().describe('Algolia object ID'),
            title: z.string().optional().describe('Title of the story or post'),
            url: z.string().optional().describe('URL of the story'),
            author: z.string().describe('Username of the author'),
            points: z.number().optional().describe('Score/points'),
            storyText: z
              .string()
              .optional()
              .describe('Text content of the story (for text posts)'),
            commentText: z.string().optional().describe('Text content of the comment'),
            commentCount: z.number().optional().describe('Number of comments'),
            storyId: z.number().optional().describe('Parent story ID (for comments)'),
            storyTitle: z.string().optional().describe('Parent story title (for comments)'),
            storyUrl: z.string().optional().describe('Parent story URL (for comments)'),
            createdAt: z.string().describe('ISO 8601 timestamp of creation'),
            tags: z.array(z.string()).describe('Content tags')
          })
        )
        .describe('Search result hits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SearchClient();

    let tagParts: string[] = [];
    if (ctx.input.contentType) {
      tagParts.push(ctx.input.contentType);
    }
    if (ctx.input.author) {
      tagParts.push(`author_${ctx.input.author}`);
    }
    if (ctx.input.storyId !== undefined) {
      tagParts.push(`story_${ctx.input.storyId}`);
    }

    let numericFilterParts: string[] = [];
    if (ctx.input.minPoints !== undefined) {
      numericFilterParts.push(`points>${ctx.input.minPoints}`);
    }
    if (ctx.input.dateFrom) {
      let timestamp = Math.floor(new Date(ctx.input.dateFrom).getTime() / 1000);
      numericFilterParts.push(`created_at_i>${timestamp}`);
    }
    if (ctx.input.dateTo) {
      let timestamp = Math.floor(new Date(ctx.input.dateTo).getTime() / 1000);
      numericFilterParts.push(`created_at_i<${timestamp}`);
    }

    let params = {
      query: ctx.input.query,
      tags: tagParts.length > 0 ? tagParts.join(',') : undefined,
      numericFilters: numericFilterParts.length > 0 ? numericFilterParts.join(',') : undefined,
      hitsPerPage: ctx.input.hitsPerPage,
      page: ctx.input.page
    };

    let response =
      ctx.input.sortBy === 'date'
        ? await client.searchByDate(params)
        : await client.search(params);

    let hits = response.hits.map(hit => ({
      objectId: hit.objectID,
      title: hit.title,
      url: hit.url,
      author: hit.author,
      points: hit.points,
      storyText: hit.story_text,
      commentText: hit.comment_text,
      commentCount: hit.num_comments,
      storyId: hit.story_id,
      storyTitle: hit.story_title,
      storyUrl: hit.story_url,
      createdAt: hit.created_at,
      tags: hit._tags
    }));

    return {
      output: {
        totalHits: response.nbHits,
        currentPage: response.page,
        totalPages: response.nbPages,
        hits
      },
      message: `Found **${response.nbHits}** results (showing page ${response.page + 1} of ${response.nbPages}).`
    };
  })
  .build();
