import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pullRequestTrigger = SlateTrigger.create(spec, {
  name: 'Pull Request',
  key: 'pull_request',
  description:
    'Triggered for pull request activity including opened, closed, merged, assigned, labeled, review requested, synchronized, and more.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('PR event action (e.g., opened, closed, synchronize, labeled)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      title: z.string().describe('PR title'),
      body: z.string().nullable().describe('PR body'),
      state: z.string().describe('PR state'),
      author: z.string().describe('PR author login'),
      head: z.string().describe('Head branch ref'),
      base: z.string().describe('Base branch ref'),
      htmlUrl: z.string().describe('URL to the PR'),
      draft: z.boolean().describe('Whether the PR is a draft'),
      merged: z.boolean().describe('Whether the PR was merged'),
      mergedBy: z.string().nullable().describe('User who merged the PR'),
      labels: z.array(z.string()).describe('Label names'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('PR event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      title: z.string().describe('PR title'),
      body: z.string().nullable().describe('PR body'),
      state: z.string().describe('PR state'),
      author: z.string().describe('PR author login'),
      head: z.string().describe('Head branch ref'),
      base: z.string().describe('Base branch ref'),
      htmlUrl: z.string().describe('URL to the PR'),
      draft: z.boolean().describe('Whether the PR is a draft'),
      merged: z.boolean().describe('Whether the PR was merged'),
      mergedBy: z.string().nullable().describe('User who merged the PR'),
      labels: z.array(z.string()).describe('Label names'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'pull_request') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let pr = data.pull_request;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            pullNumber: pr.number,
            title: pr.title,
            body: pr.body,
            state: pr.state,
            author: pr.user.login,
            head: pr.head.ref,
            base: pr.base.ref,
            htmlUrl: pr.html_url,
            draft: pr.draft ?? false,
            merged: pr.merged ?? false,
            mergedBy: pr.merged_by?.login ?? null,
            labels: (pr.labels ?? []).map((l: any) => l.name),
            assignees: (pr.assignees ?? []).map((a: any) => a.login),
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pull_request.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          pullNumber: ctx.input.pullNumber,
          title: ctx.input.title,
          body: ctx.input.body,
          state: ctx.input.state,
          author: ctx.input.author,
          head: ctx.input.head,
          base: ctx.input.base,
          htmlUrl: ctx.input.htmlUrl,
          draft: ctx.input.draft,
          merged: ctx.input.merged,
          mergedBy: ctx.input.mergedBy,
          labels: ctx.input.labels,
          assignees: ctx.input.assignees,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
