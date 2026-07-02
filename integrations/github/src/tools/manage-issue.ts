import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let manageIssue = SlateTool.create(spec, {
  name: 'Manage Issue',
  key: 'manage_issue',
  description: `Create a new issue or update an existing one in a GitHub repository.
When creating: provide title and optionally body, labels, assignees, and milestone.
When updating: provide the issue number along with fields to change (title, body, state, labels, assignees).`,
  instructions: [
    'To create a new issue, omit issueNumber and provide at least a title.',
    'To update an existing issue, provide the issueNumber along with the fields to change.',
    'To close an issue, set state to "closed". To reopen, set state to "open".'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      issueNumber: z
        .number()
        .optional()
        .describe('Issue number to update. Omit to create a new issue.'),
      title: z.string().optional().describe('Issue title (required when creating)'),
      body: z.string().optional().describe('Issue body in Markdown'),
      state: z.enum(['open', 'closed']).optional().describe('Issue state (only for updates)'),
      stateReason: z
        .enum(['completed', 'not_planned', 'reopened'])
        .optional()
        .describe('Reason for state change'),
      labels: z.array(z.string()).optional().describe('Labels to set on the issue'),
      assignees: z.array(z.string()).optional().describe('Usernames to assign'),
      milestone: z
        .number()
        .nullable()
        .optional()
        .describe('Milestone number to set, or null to remove')
    })
  )
  .output(
    z.object({
      issueNumber: z.number().describe('Issue number'),
      issueId: z.number().describe('Unique issue ID'),
      title: z.string().describe('Issue title'),
      state: z.string().describe('Issue state (open/closed)'),
      htmlUrl: z.string().describe('URL to the issue on GitHub'),
      author: z.string().describe('Issue author login'),
      assignees: z.array(z.string()).describe('Assigned usernames'),
      labels: z.array(z.string()).describe('Label names'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, issueNumber, ...data } = ctx.input;
    let issue: any;

    if (issueNumber) {
      issue = await client.updateIssue(owner, repo, issueNumber, data);
    } else {
      if (!data.title) {
        throw new Error('Title is required when creating a new issue.');
      }
      issue = await client.createIssue(owner, repo, {
        title: data.title,
        body: data.body,
        assignees: data.assignees,
        labels: data.labels,
        milestone: data.milestone ?? undefined
      });
    }

    return {
      output: {
        issueNumber: issue.number,
        issueId: issue.id,
        title: issue.title,
        state: issue.state,
        htmlUrl: issue.html_url,
        author: issue.user.login,
        assignees: (issue.assignees ?? []).map((a: any) => a.login),
        labels: (issue.labels ?? []).map((l: any) => l.name),
        createdAt: issue.created_at,
        updatedAt: issue.updated_at
      },
      message: issueNumber
        ? `Updated issue **#${issue.number}** in **${owner}/${repo}** — ${issue.html_url}`
        : `Created issue **#${issue.number}**: "${issue.title}" in **${owner}/${repo}** — ${issue.html_url}`
    };
  })
  .build();
