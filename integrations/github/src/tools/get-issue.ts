import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getIssue = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific issue, including its body, comments count, labels, assignees, and milestone.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number')
    })
  )
  .output(
    z.object({
      issueNumber: z.number().describe('Issue number'),
      issueId: z.number().describe('Unique issue ID'),
      title: z.string().describe('Issue title'),
      body: z.string().nullable().describe('Issue body in Markdown'),
      state: z.string().describe('Issue state (open/closed)'),
      stateReason: z.string().nullable().describe('Reason for the state'),
      htmlUrl: z.string().describe('URL to the issue on GitHub'),
      author: z.string().describe('Issue author login'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      labels: z.array(z.string()).describe('Label names'),
      milestoneName: z.string().nullable().describe('Milestone title'),
      commentsCount: z.number().describe('Number of comments'),
      locked: z.boolean().describe('Whether the issue is locked'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp'),
      closedAt: z.string().nullable().describe('Closure timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let issue = await client.getIssue(ctx.input.owner, ctx.input.repo, ctx.input.issueNumber);

    return {
      output: {
        issueNumber: issue.number,
        issueId: issue.id,
        title: issue.title,
        body: issue.body,
        state: issue.state,
        stateReason: issue.state_reason ?? null,
        htmlUrl: issue.html_url,
        author: issue.user.login,
        assignees: (issue.assignees ?? []).map((a: any) => a.login),
        labels: (issue.labels ?? []).map((l: any) => l.name),
        milestoneName: issue.milestone?.title ?? null,
        commentsCount: issue.comments,
        locked: issue.locked,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        closedAt: issue.closed_at
      },
      message: `Issue **#${issue.number}**: "${issue.title}" (${issue.state}) — ${issue.html_url}`
    };
  })
  .build();
