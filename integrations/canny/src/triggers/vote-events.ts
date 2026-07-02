import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let voteEventsTrigger = SlateTrigger.create(spec, {
  name: 'Vote Events',
  key: 'vote_events',
  description:
    'Triggers when a vote is created (user votes on a post) or deleted (user removes their vote).'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of vote event'),
      objectId: z.string().describe('Unique event/object identifier'),
      vote: z.any().describe('Vote object from the webhook payload')
    })
  )
  .output(
    z.object({
      voteId: z.string().describe('Vote ID'),
      voterId: z.string().nullable().describe('Voter user ID'),
      voterName: z.string().nullable().describe('Voter name'),
      voterEmail: z.string().nullable().describe('Voter email'),
      postId: z.string().nullable().describe('Post ID that was voted on'),
      postTitle: z.string().nullable().describe('Post title'),
      boardName: z.string().nullable().describe('Board name'),
      boardId: z.string().nullable().describe('Board ID'),
      created: z.string().describe('Vote timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let eventType = data.type as string;

      if (!eventType?.startsWith('vote.')) {
        return { inputs: [] };
      }

      let vote = data.object || {};
      let objectId = data.objectID || vote.id || `${eventType}-${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            objectId,
            vote
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let vote = ctx.input.vote || {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.objectId,
        output: {
          voteId: vote.id || '',
          voterId: vote.voter?.id || null,
          voterName: vote.voter?.name || null,
          voterEmail: vote.voter?.email || null,
          postId: vote.post?.id || null,
          postTitle: vote.post?.title || null,
          boardName: vote.board?.name || null,
          boardId: vote.board?.id || null,
          created: vote.created || ''
        }
      };
    }
  })
  .build();
