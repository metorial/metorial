import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let starTrigger = SlateTrigger.create(spec, {
  name: 'Star',
  key: 'star',
  description: 'Triggered when a repository is starred or unstarred.'
})
  .input(
    z.object({
      action: z.string().describe('Star action (created or deleted)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      starredAt: z.string().nullable().describe('Timestamp when the star was created'),
      sender: z.string().describe('User who starred/unstarred'),
      senderAvatarUrl: z.string().describe('Avatar URL of the sender'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Star action (created or deleted)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      starredAt: z.string().nullable().describe('Timestamp when the star was created'),
      sender: z.string().describe('User who starred/unstarred'),
      senderAvatarUrl: z.string().describe('Avatar URL of the sender')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'star') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            starredAt: data.starred_at ?? null,
            sender: data.sender.login,
            senderAvatarUrl: data.sender.avatar_url,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `star.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          starredAt: ctx.input.starredAt,
          sender: ctx.input.sender,
          senderAvatarUrl: ctx.input.senderAvatarUrl
        }
      };
    }
  })
  .build();
