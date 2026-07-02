import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { HNClient } from '../lib/client';
import { spec } from '../spec';

export let newStories = SlateTrigger.create(spec, {
  name: 'New Stories',
  key: 'new_stories',
  description:
    'Triggers when new stories are posted to Hacker News. Polls for newly submitted stories and returns their full details.'
})
  .input(
    z.object({
      itemId: z.number().describe('ID of the new story'),
      title: z.string().optional().describe('Title of the story'),
      url: z.string().optional().describe('URL of the story'),
      author: z.string().optional().describe('Username of the author'),
      score: z.number().optional().describe('Score/points of the story'),
      commentCount: z.number().optional().describe('Total number of comments'),
      text: z.string().optional().describe('Text content (for text posts)'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
      type: z.string().optional().describe('Item type')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Unique identifier of the story'),
      title: z.string().optional().describe('Title of the story'),
      url: z.string().optional().describe('URL of the story'),
      author: z.string().optional().describe('Username of the author'),
      score: z.number().optional().describe('Score/points of the story'),
      commentCount: z.number().optional().describe('Total number of comments'),
      text: z.string().optional().describe('Text content (for text posts)'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp of creation'),
      type: z.string().optional().describe('Item type: story, job, poll')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new HNClient();
      let newStoryIds = await client.getStoryIds('new');

      let lastSeenMaxId = (ctx.state as any)?.lastSeenMaxId as number | undefined;

      if (!lastSeenMaxId) {
        return {
          inputs: [],
          updatedState: {
            lastSeenMaxId: newStoryIds.length > 0 ? Math.max(...newStoryIds.slice(0, 30)) : 0
          }
        };
      }

      let freshIds = newStoryIds.filter(id => id > lastSeenMaxId);
      let idsToFetch = freshIds.slice(0, 50);

      let items = await client.getItems(idsToFetch);

      let inputs = items.map(item => ({
        itemId: item.id,
        title: item.title,
        url: item.url,
        author: item.by,
        score: item.score,
        commentCount: item.descendants,
        text: item.text,
        createdAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
        type: item.type
      }));

      let newMaxId = idsToFetch.length > 0 ? Math.max(...idsToFetch) : lastSeenMaxId;

      return {
        inputs,
        updatedState: {
          lastSeenMaxId: Math.max(newMaxId, lastSeenMaxId)
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `story.created`,
        id: String(ctx.input.itemId),
        output: {
          itemId: ctx.input.itemId,
          title: ctx.input.title,
          url: ctx.input.url,
          author: ctx.input.author,
          score: ctx.input.score,
          commentCount: ctx.input.commentCount,
          text: ctx.input.text,
          createdAt: ctx.input.createdAt,
          type: ctx.input.type
        }
      };
    }
  })
  .build();
