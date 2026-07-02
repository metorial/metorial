import { SlateTool } from 'slates';
import { z } from 'zod';
import { HNClient, type StoryListType } from '../lib/client';
import { spec } from '../spec';

export let listStories = SlateTool.create(spec, {
  name: 'List Stories',
  key: 'list_stories',
  description: `Retrieve a ranked list of Hacker News stories by category. Supports top, new, best, Ask HN, Show HN, and job listings.
Returns story IDs with optional full story details. Up to 500 stories are available for top/new/best, and up to 200 for ask/show/job.`,
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
        .describe('Maximum number of stories to return (default: 30)'),
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
            createdAt: z
              .string()
              .optional()
              .describe('ISO 8601 timestamp when the story was created')
          })
        )
        .optional()
        .describe('Full story details (when fetchDetails is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HNClient();
    let allIds = await client.getStoryIds(ctx.input.category as StoryListType);
    let limitedIds = allIds.slice(0, ctx.input.limit);

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
    let stories = items.map(item => ({
      itemId: item.id,
      title: item.title,
      url: item.url,
      author: item.by,
      score: item.score,
      commentCount: item.descendants,
      createdAt: item.time ? new Date(item.time * 1000).toISOString() : undefined
    }));

    return {
      output: {
        category: ctx.input.category,
        totalAvailable: allIds.length,
        stories
      },
      message: `Retrieved **${stories.length}** ${ctx.input.category} stories with details (${allIds.length} total available).`
    };
  })
  .build();
