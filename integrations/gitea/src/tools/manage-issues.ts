import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let issueOutputSchema = z.object({
  issueNumber: z.number().describe('Issue number'),
  title: z.string().describe('Issue title'),
  body: z.string().describe('Issue body/description'),
  state: z.string().describe('Issue state (open or closed)'),
  htmlUrl: z.string().describe('Web URL of the issue'),
  authorLogin: z.string().describe('Username of the issue author'),
  labels: z
    .array(
      z.object({
        labelId: z.number().describe('Label ID'),
        name: z.string().describe('Label name'),
        color: z.string().describe('Label hex color')
      })
    )
    .describe('Assigned labels'),
  milestoneTitle: z.string().optional().describe('Milestone title if assigned'),
  assignees: z.array(z.string()).describe('Assigned usernames'),
  commentsCount: z.number().describe('Number of comments'),
  dueDate: z.string().optional().describe('Due date if set'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  closedAt: z.string().optional().describe('Closed timestamp')
});

export let listIssues = SlateTool.create(spec, {
  name: 'List Issues',
  key: 'list_issues',
  description: `List issues in a repository with filtering by state, labels, milestone, and type. Returns issues excluding pull requests by default.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      state: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter by issue state (default: open)'),
      labels: z
        .string()
        .optional()
        .describe('Comma-separated list of label names to filter by'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page'),
      sort: z
        .enum([
          'oldest',
          'recentupdate',
          'leastupdate',
          'mostcomment',
          'leastcomment',
          'priority'
        ])
        .optional()
        .describe('Sort order')
    })
  )
  .output(
    z.object({
      issues: z.array(issueOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let issues = await client.listRepoIssues(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      type: 'issues',
      labels: ctx.input.labels,
      page: ctx.input.page,
      limit: ctx.input.limit,
      sort: ctx.input.sort
    });

    let mapped = issues.map(i => ({
      issueNumber: i.number,
      title: i.title,
      body: i.body || '',
      state: i.state,
      htmlUrl: i.html_url,
      authorLogin: i.user.login,
      labels: (i.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
      milestoneTitle: i.milestone?.title,
      assignees: (i.assignees || []).map(a => a.login),
      commentsCount: i.comments,
      dueDate: i.due_date || undefined,
      createdAt: i.created_at,
      updatedAt: i.updated_at,
      closedAt: i.closed_at || undefined
    }));

    return {
      output: { issues: mapped },
      message: `Found **${mapped.length}** issues in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let getIssue = SlateTool.create(spec, {
  name: 'Get Issue',
  key: 'get_issue',
  description: `Retrieve detailed information about a specific issue including its labels, assignees, milestone, and comments count.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let i = await client.getIssue(ctx.input.owner, ctx.input.repo, ctx.input.issueNumber);

    return {
      output: {
        issueNumber: i.number,
        title: i.title,
        body: i.body || '',
        state: i.state,
        htmlUrl: i.html_url,
        authorLogin: i.user.login,
        labels: (i.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: i.milestone?.title,
        assignees: (i.assignees || []).map(a => a.login),
        commentsCount: i.comments,
        dueDate: i.due_date || undefined,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        closedAt: i.closed_at || undefined
      },
      message: `Retrieved issue **#${i.number}: ${i.title}** (${i.state})`
    };
  })
  .build();

export let createIssue = SlateTool.create(spec, {
  name: 'Create Issue',
  key: 'create_issue',
  description: `Create a new issue in a repository with optional labels, assignees, milestone, and due date.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Issue title'),
      body: z.string().optional().describe('Issue description (supports Markdown)'),
      assignees: z.array(z.string()).optional().describe('Usernames to assign to the issue'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to attach'),
      milestoneId: z.number().optional().describe('Milestone ID to assign'),
      dueDate: z.string().optional().describe('Due date in ISO 8601 format')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let i = await client.createIssue(ctx.input.owner, ctx.input.repo, {
      title: ctx.input.title,
      body: ctx.input.body,
      assignees: ctx.input.assignees,
      labels: ctx.input.labelIds,
      milestone: ctx.input.milestoneId,
      dueDate: ctx.input.dueDate
    });

    return {
      output: {
        issueNumber: i.number,
        title: i.title,
        body: i.body || '',
        state: i.state,
        htmlUrl: i.html_url,
        authorLogin: i.user.login,
        labels: (i.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: i.milestone?.title,
        assignees: (i.assignees || []).map(a => a.login),
        commentsCount: i.comments,
        dueDate: i.due_date || undefined,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        closedAt: i.closed_at || undefined
      },
      message: `Created issue **#${i.number}: ${i.title}** in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let updateIssue = SlateTool.create(spec, {
  name: 'Update Issue',
  key: 'update_issue',
  description: `Update an existing issue's title, body, state, assignees, labels, milestone, or due date. Can be used to close or reopen issues.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue number to update'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New description'),
      state: z.enum(['open', 'closed']).optional().describe('Set issue state'),
      assignees: z
        .array(z.string())
        .optional()
        .describe('Replace assignees with these usernames'),
      milestoneId: z.number().optional().describe('Set milestone ID (use 0 to remove)'),
      dueDate: z.string().optional().describe('Set due date in ISO 8601 format'),
      addLabelIds: z.array(z.number()).optional().describe('Label IDs to add to the issue'),
      removeLabelIds: z
        .array(z.number())
        .optional()
        .describe('Label IDs to remove from the issue')
    })
  )
  .output(issueOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });

    let i = await client.updateIssue(ctx.input.owner, ctx.input.repo, ctx.input.issueNumber, {
      title: ctx.input.title,
      body: ctx.input.body,
      state: ctx.input.state,
      assignees: ctx.input.assignees,
      milestone:
        ctx.input.milestoneId !== undefined
          ? ctx.input.milestoneId === 0
            ? null
            : ctx.input.milestoneId
          : undefined,
      dueDate: ctx.input.dueDate
    });

    if (ctx.input.addLabelIds && ctx.input.addLabelIds.length > 0) {
      await client.addIssueLabels(
        ctx.input.owner,
        ctx.input.repo,
        ctx.input.issueNumber,
        ctx.input.addLabelIds
      );
    }
    if (ctx.input.removeLabelIds) {
      for (let labelId of ctx.input.removeLabelIds) {
        await client.removeIssueLabel(
          ctx.input.owner,
          ctx.input.repo,
          ctx.input.issueNumber,
          labelId
        );
      }
    }

    // Re-fetch to get updated labels
    if (ctx.input.addLabelIds || ctx.input.removeLabelIds) {
      i = await client.getIssue(ctx.input.owner, ctx.input.repo, ctx.input.issueNumber);
    }

    return {
      output: {
        issueNumber: i.number,
        title: i.title,
        body: i.body || '',
        state: i.state,
        htmlUrl: i.html_url,
        authorLogin: i.user.login,
        labels: (i.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: i.milestone?.title,
        assignees: (i.assignees || []).map(a => a.login),
        commentsCount: i.comments,
        dueDate: i.due_date || undefined,
        createdAt: i.created_at,
        updatedAt: i.updated_at,
        closedAt: i.closed_at || undefined
      },
      message: `Updated issue **#${i.number}: ${i.title}** (${i.state})`
    };
  })
  .build();
