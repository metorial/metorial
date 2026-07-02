import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pushTrigger = SlateTrigger.create(spec, {
  name: 'Push',
  key: 'push',
  description: 'Triggered when commits are pushed to a branch or tag in a repository.'
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      ref: z.string().describe('Git ref that was pushed to (e.g., "refs/heads/main")'),
      before: z.string().describe('SHA of the previous HEAD commit'),
      after: z.string().describe('SHA of the new HEAD commit'),
      pusher: z.string().describe('Username of the pusher'),
      forced: z.boolean().describe('Whether the push was a force push'),
      commits: z
        .array(
          z.object({
            sha: z.string(),
            message: z.string(),
            author: z.string(),
            url: z.string()
          })
        )
        .describe('Commits included in the push'),
      headCommitMessage: z.string().nullable().describe('Message of the head commit'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      ref: z.string().describe('Git ref that was pushed to'),
      branch: z.string().nullable().describe('Branch name (null for tags)'),
      before: z.string().describe('SHA of the previous HEAD commit'),
      after: z.string().describe('SHA of the new HEAD commit'),
      pusher: z.string().describe('Username of the pusher'),
      forced: z.boolean().describe('Whether the push was a force push'),
      commits: z
        .array(
          z.object({
            sha: z.string().describe('Commit SHA'),
            message: z.string().describe('Commit message'),
            author: z.string().describe('Commit author'),
            url: z.string().describe('Commit URL')
          })
        )
        .describe('Commits in the push'),
      commitCount: z.number().describe('Number of commits in the push'),
      headCommitMessage: z.string().nullable().describe('Message of the head commit')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event === 'ping' || event !== 'push') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      let commits = (data.commits ?? []).map((c: any) => ({
        sha: c.id,
        message: c.message,
        author: c.author?.username ?? c.author?.name ?? 'unknown',
        url: c.url
      }));

      return {
        inputs: [
          {
            owner: data.repository.owner.login ?? data.repository.owner.name,
            repo: data.repository.name,
            ref: data.ref,
            before: data.before,
            after: data.after,
            pusher: data.pusher?.name ?? 'unknown',
            forced: data.forced ?? false,
            commits,
            headCommitMessage: data.head_commit?.message ?? null,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let branch: string | null = null;
      if (ctx.input.ref.startsWith('refs/heads/')) {
        branch = ctx.input.ref.replace('refs/heads/', '');
      }

      return {
        type: 'push',
        id: ctx.input.deliveryId,
        output: {
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          ref: ctx.input.ref,
          branch,
          before: ctx.input.before,
          after: ctx.input.after,
          pusher: ctx.input.pusher,
          forced: ctx.input.forced,
          commits: ctx.input.commits,
          commitCount: ctx.input.commits.length,
          headCommitMessage: ctx.input.headCommitMessage
        }
      };
    }
  })
  .build();
