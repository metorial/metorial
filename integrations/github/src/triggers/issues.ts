import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let issuesTrigger = SlateTrigger.create(spec, {
  name: 'Issues',
  key: 'issues',
  description:
    'Triggered for issue activity including opened, edited, closed, assigned, labeled, milestoned, and more.'
})
  .input(
    z.object({
      action: z
        .string()
        .describe('Issue event action (e.g., opened, closed, edited, labeled)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
      title: z.string().describe('Issue title'),
      body: z.string().nullable().describe('Issue body'),
      state: z.string().describe('Issue state'),
      author: z.string().describe('Issue author login'),
      htmlUrl: z.string().describe('URL to the issue'),
      labels: z.array(z.string()).describe('Label names'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      milestoneName: z.string().nullable().describe('Milestone title'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      closedAt: z.string().nullable().describe('Closure timestamp'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Issue event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number'),
      title: z.string().describe('Issue title'),
      body: z.string().nullable().describe('Issue body'),
      state: z.string().describe('Issue state'),
      author: z.string().describe('Issue author login'),
      htmlUrl: z.string().describe('URL to the issue'),
      labels: z.array(z.string()).describe('Label names'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      milestoneName: z.string().nullable().describe('Milestone title'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      closedAt: z.string().nullable().describe('Closure timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'issues') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let issue = data.issue;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            issueNumber: issue.number,
            title: issue.title,
            body: issue.body,
            state: issue.state,
            author: issue.user.login,
            htmlUrl: issue.html_url,
            labels: (issue.labels ?? []).map((l: any) => l.name),
            assignees: (issue.assignees ?? []).map((a: any) => a.login),
            milestoneName: issue.milestone?.title ?? null,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            closedAt: issue.closed_at ?? null,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `issue.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          issueNumber: ctx.input.issueNumber,
          title: ctx.input.title,
          body: ctx.input.body,
          state: ctx.input.state,
          author: ctx.input.author,
          htmlUrl: ctx.input.htmlUrl,
          labels: ctx.input.labels,
          assignees: ctx.input.assignees,
          milestoneName: ctx.input.milestoneName,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          closedAt: ctx.input.closedAt
        }
      };
    }
  })
  .build();
