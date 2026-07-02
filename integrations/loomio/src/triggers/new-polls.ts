import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newPolls = SlateTrigger.create(spec, {
  name: 'New Poll',
  key: 'new_polls',
  description:
    'Triggers when a new poll or proposal is created. Polls for recently created polls and proposals of any type.'
})
  .input(
    z.object({
      pollId: z.number().describe('ID of the poll'),
      pollKey: z.string().describe('Key of the poll'),
      title: z.string().describe('Title of the poll'),
      pollType: z.string().describe('Type of the poll'),
      details: z.string().optional().describe('Description of the poll'),
      groupId: z.number().optional().describe('ID of the group'),
      discussionId: z.number().optional().describe('ID of the associated discussion'),
      authorId: z.number().optional().describe('ID of the author'),
      closingAt: z.string().optional().describe('ISO 8601 closing time'),
      createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
    })
  )
  .output(
    z.object({
      pollId: z.number().describe('ID of the poll'),
      pollKey: z.string().describe('Key of the poll'),
      title: z.string().describe('Title of the poll'),
      pollType: z.string().describe('Type of the poll'),
      details: z.string().optional().describe('Description of the poll'),
      groupId: z.number().optional().describe('ID of the group'),
      discussionId: z.number().optional().describe('ID of the associated discussion'),
      authorId: z.number().optional().describe('ID of the author'),
      closingAt: z.string().optional().describe('ISO 8601 closing time'),
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

      let result = await client.listPolls();
      let polls: any[] = result.polls || [];

      // Sort by id descending to get newest first
      polls.sort((a: any, b: any) => b.id - a.id);

      // Filter to only new polls since last seen
      let newPolls = lastSeenId
        ? polls.filter((p: any) => p.id > lastSeenId)
        : polls.slice(0, 10); // On first poll, take the 10 most recent

      let newestId = polls.length > 0 ? polls[0]!.id : lastSeenId;

      return {
        inputs: newPolls.map((p: any) => ({
          pollId: p.id,
          pollKey: p.key,
          title: p.title,
          pollType: p.poll_type,
          details: p.details,
          groupId: p.group_id,
          discussionId: p.discussion_id,
          authorId: p.author_id,
          closingAt: p.closing_at,
          createdAt: p.created_at
        })),
        updatedState: {
          lastSeenId: newestId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'poll.created',
        id: `poll-${ctx.input.pollId}`,
        output: {
          pollId: ctx.input.pollId,
          pollKey: ctx.input.pollKey,
          title: ctx.input.title,
          pollType: ctx.input.pollType,
          details: ctx.input.details,
          groupId: ctx.input.groupId,
          discussionId: ctx.input.discussionId,
          authorId: ctx.input.authorId,
          closingAt: ctx.input.closingAt,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
