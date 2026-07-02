import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newDiscussions = SlateTrigger.create(spec, {
  name: 'New Discussion',
  key: 'new_discussions',
  description:
    'Triggers when a new discussion thread is created. Polls for recently created discussions.'
})
  .input(
    z.object({
      discussionId: z.number().describe('ID of the discussion'),
      discussionKey: z.string().describe('Key of the discussion'),
      title: z.string().describe('Title of the discussion'),
      description: z.string().optional().describe('Body content of the discussion'),
      descriptionFormat: z.string().optional().describe('Format of the description'),
      groupId: z.number().optional().describe('ID of the group'),
      authorId: z.number().optional().describe('ID of the author'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      discussionId: z.number().describe('ID of the discussion'),
      discussionKey: z.string().describe('Key of the discussion'),
      title: z.string().describe('Title of the discussion'),
      description: z.string().optional().describe('Body content of the discussion'),
      descriptionFormat: z.string().optional().describe('Format of the description'),
      groupId: z.number().optional().describe('ID of the group'),
      authorId: z.number().optional().describe('ID of the author'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastSeenId = (ctx.state as any)?.lastSeenId as number | undefined;

      let result = await client.listDiscussions();
      let discussions: any[] = result.discussions || [];

      // Sort by id descending to get newest first
      discussions.sort((a: any, b: any) => b.id - a.id);

      // Filter to only new discussions since last seen
      let newDiscussions = lastSeenId
        ? discussions.filter((d: any) => d.id > lastSeenId)
        : discussions.slice(0, 10); // On first poll, take the 10 most recent

      let newestId = discussions.length > 0 ? discussions[0]!.id : lastSeenId;

      return {
        inputs: newDiscussions.map((d: any) => ({
          discussionId: d.id,
          discussionKey: d.key,
          title: d.title,
          description: d.description,
          descriptionFormat: d.description_format,
          groupId: d.group_id,
          authorId: d.author_id,
          createdAt: d.created_at
        })),
        updatedState: {
          lastSeenId: newestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'discussion.created',
        id: `discussion-${ctx.input.discussionId}`,
        output: {
          discussionId: ctx.input.discussionId,
          discussionKey: ctx.input.discussionKey,
          title: ctx.input.title,
          description: ctx.input.description,
          descriptionFormat: ctx.input.descriptionFormat,
          groupId: ctx.input.groupId,
          authorId: ctx.input.authorId,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
