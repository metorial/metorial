import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { toIsoTimestamp, validateInteger } from '../lib/validation';
import { spec } from '../spec';

export let listStories = SlateTool.create(spec, {
  name: 'List Stories',
  key: 'list_stories',
  description: `Retrieve a ranked list of Hacker News stories by category. Supports top, new, best, Ask HN, Show HN, and job listings.
Returns story IDs with optional full story details. Top and new feeds contain up to 500 items; Ask HN, Show HN, and job feeds contain up to 200. Top stories can include jobs.`,
  instructions: [
    'Set **fetchDetails** to true to get full story data instead of just IDs. This makes additional API calls, so use a reasonable limit.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      category: z
        .enum(['top', 'new', 'best', 'ask', 'show', 'job'])
        .describe('Story category to retrieve'),
      limit: z
        .number()
        .optional()
        .default(30)
        .describe('Maximum number of stories to return, from 0 to 500 (default: 30)'),
      offset: z
        .number()
        .optional()
        .describe('Number of ranked story IDs to skip (default: 0)'),
      fetchDetails: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          'Whether to fetch full details for each story (default: false, returns only IDs)'
        )
    })
  )
  .output(
    z.object({
      category: z.string().describe('The category that was queried'),
      totalAvailable: z
        .number()
        .describe('Total number of story IDs available in this category'),
      storyIds: z
        .array(z.number())
        .optional()
        .describe('Array of story IDs (when fetchDetails is false)'),
      stories: z
        .array(
          z.object({
            itemId: z.number().describe('Unique identifier of the story'),
            title: z.string().optional().describe('Title of the story'),
            url: z.string().optional().describe('URL of the story'),
            author: z.string().optional().describe('Username of the author'),
            score: z.number().optional().describe('Score/points of the story'),
            commentCount: z.number().optional().describe('Total number of comments'),
            deleted: z.boolean().optional().describe('Whether the item has been deleted'),
            dead: z.boolean().optional().describe('Whether the item is dead or flagged'),
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the story was created')
          })
        )
        .optional()
        .describe('Full story details (when fetchDetails is true)'),
      unavailableItemIds: z
        .array(z.number())
        .optional()
        .describe('Requested item IDs that were unavailable when fetching details')
    })
  )
  .handleInvocation(async ctx => {
    validateInteger(ctx.input.limit, 'limit', 0, 500);
    let offset = ctx.input.offset ?? 0;
    validateInteger(offset, 'offset', 0);
    let client = new HNClient();
    let allIds = await client.getStoryIds(ctx.input.category);
    let limitedIds = allIds.slice(offset, offset + ctx.input.limit);

    if (!ctx.input.fetchDetails) {
      return {
        output: {
          category: ctx.input.category,
          totalAvailable: allIds.length,
          storyIds: limitedIds
        },
        message: `Retrieved **${limitedIds.length}** ${ctx.input.category} story IDs (${allIds.length} total available).`
      };
    }

    let items = await client.getItems(limitedIds);
    let returnedIds = new Set(items.map(item => item.id));
    let unavailableItemIds = limitedIds.filter(id => !returnedIds.has(id));
    let stories = items.map(item => ({
      itemId: item.id,
      title: item.title,
      url: item.url,
      author: item.by,
      score: item.score,
      commentCount: item.descendants,
      deleted: item.deleted,
      dead: item.dead,
      createdAt: toIsoTimestamp(item.time)
    }));

    return {
      output: {
        category: ctx.input.category,
        totalAvailable: allIds.length,
        stories,
        unavailableItemIds
      },
      message: `Retrieved **${stories.length}** ${ctx.input.category} stories with details (${allIds.length} total available).`
    };
  })
  .build();
