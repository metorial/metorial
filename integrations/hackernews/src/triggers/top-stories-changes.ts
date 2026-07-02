import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let topStoriesChanges = SlateTrigger.create(spec, {
  name: 'Top Stories Changes',
  key: 'top_stories_changes',
  description:
    'Triggers when stories enter the Hacker News top stories list. Detects new stories appearing in the top rankings that were not previously present.'
})
  .input(
    z.object({
      itemId: z.number().describe('ID of the story that entered top stories'),
      rank: z.number().describe('Current rank position in the top stories list (1-based)'),
      title: z.string().optional().describe('Title of the story'),
      url: z.string().optional().describe('URL of the story'),
      author: z.string().optional().describe('Username of the author'),
      score: z.number().optional().describe('Score/points of the story'),
      commentCount: z.number().optional().describe('Total number of comments'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of creation')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique identifier of the story'),
      rank: z.number().describe('Current rank position in the top stories list (1-based)'),
      title: z.string().optional().describe('Title of the story'),
      url: z.string().optional().describe('URL of the story'),
      author: z.string().optional().describe('Username of the author'),
      score: z.number().optional().describe('Score/points of the story'),
      commentCount: z.number().optional().describe('Total number of comments'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of creation')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HNClient();
      let topStoryIds = await client.getStoryIds('top');

      let previousTopIds = (ctx.state as any)?.previousTopIds as number[] | undefined;

      if (!previousTopIds) {
        return {
          inputs: [],
          updatedState: {
            previousTopIds: topStoryIds.slice(0, 100)
          }
        };
      }

      let previousSet = new Set(previousTopIds);
      let newEntries: { itemId: number; rank: number }[] = [];

      for (let i = 0; i < Math.min(topStoryIds.length, 100); i++) {
        let storyId = topStoryIds[i]!;
        if (!previousSet.has(storyId)) {
          newEntries.push({ itemId: storyId, rank: i + 1 });
        }
      }

      let itemIds = newEntries.map(e => e.itemId);
      let items = itemIds.length > 0 ? await client.getItems(itemIds) : [];
      let itemMap = new Map(items.map(item => [item.id, item]));

      let inputs = newEntries.map(entry => {
        let item = itemMap.get(entry.itemId);
        return {
          itemId: entry.itemId,
          rank: entry.rank,
          title: item?.title,
          url: item?.url,
          author: item?.by,
          score: item?.score ?? 0,
          commentCount: item?.descendants ?? 0,
          createdAt: item?.time ? new Date(item.time * 1000).toISOString() : undefined
        };
      });

      return {
        inputs,
        updatedState: {
          previousTopIds: topStoryIds.slice(0, 100)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'story.entered_top',
        id: `top-${ctx.input.itemId}-${Date.now()}`,
        output: {
          itemId: ctx.input.itemId,
          rank: ctx.input.rank,
          title: ctx.input.title,
          url: ctx.input.url,
          author: ctx.input.author,
          score: ctx.input.score,
          commentCount: ctx.input.commentCount,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
