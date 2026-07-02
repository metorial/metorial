import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { postOutputSchema } from './create-post';

export let listPostsTool = SlateTool.create(spec, {
  name: 'List Posts',
  key: 'list_posts',
  description: `Search and list Beamer posts with optional filters. Filter by category, date range, publication status, segmentation, and more. Returns up to 10 posts per page with pagination support.`,
  instructions: [
    'Use page and maxResults for pagination (max 10 results per page).',
    'Set ignoreFilters to true to bypass segmentation and see all posts.'
  ],
  constraints: ['Maximum 10 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('Segmentation filter to match'),
      forceFilter: z.string().optional().describe('Enforce exact segmentation match'),
      filterUrl: z.string().optional().describe('URL-based segmentation pattern'),
      dateFrom: z.string().optional().describe('Return posts after this date (ISO-8601)'),
      dateTo: z.string().optional().describe('Return posts before this date (ISO-8601)'),
      language: z.string().optional().describe('ISO-639 language code'),
      category: z
        .string()
        .optional()
        .describe('Filter by category (new, improvement, fix, or custom)'),
      published: z.boolean().optional().describe('Filter by published status'),
      archived: z.boolean().optional().describe('Filter by archived status'),
      expired: z.boolean().optional().describe('Filter by expired status'),
      ignoreFilters: z
        .boolean()
        .optional()
        .describe('Retrieve all posts, ignoring segmentation'),
      maxResults: z.number().optional().describe('Max results per page (max 10)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      posts: z.array(postOutputSchema).describe('List of matching posts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let posts = await client.listPosts({
      filter: ctx.input.filter,
      forceFilter: ctx.input.forceFilter,
      filterUrl: ctx.input.filterUrl,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      language: ctx.input.language,
      category: ctx.input.category,
      published: ctx.input.published,
      archived: ctx.input.archived,
      expired: ctx.input.expired,
      ignoreFilters: ctx.input.ignoreFilters,
      maxResults: ctx.input.maxResults,
      page: ctx.input.page
    });

    let output = posts.map(post => ({
      postId: post.id,
      date: post.date,
      dueDate: post.dueDate,
      published: post.published,
      pinned: post.pinned,
      showInWidget: post.showInWidget,
      showInStandalone: post.showInStandalone,
      category: post.category,
      boostedAnnouncement: post.boostedAnnouncement,
      translations: post.translations ?? [],
      filter: post.filter,
      filterUrl: post.filterUrl,
      autoOpen: post.autoOpen,
      feedbackEnabled: post.feedbackEnabled,
      reactionsEnabled: post.reactionsEnabled,
      views: post.views,
      uniqueViews: post.uniqueViews,
      clicks: post.clicks,
      positiveReactions: post.positiveReactions,
      neutralReactions: post.neutralReactions,
      negativeReactions: post.negativeReactions
    }));

    return {
      output: { posts: output },
      message: `Found **${output.length}** post(s).${ctx.input.page ? ` Page ${ctx.input.page}.` : ''}`
    };
  })
  .build();
