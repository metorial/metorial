import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let prOutputSchema = z.object({
  prNumber: z.number().describe('Pull request number'),
  title: z.string().describe('Pull request title'),
  body: z.string().describe('Pull request description'),
  state: z.string().describe('Pull request state (open, closed)'),
  htmlUrl: z.string().describe('Web URL of the pull request'),
  authorLogin: z.string().describe('Username of the PR author'),
  headBranch: z.string().describe('Source branch'),
  baseBranch: z.string().describe('Target branch'),
  isMerged: z.boolean().describe('Whether the PR has been merged'),
  isMergeable: z.boolean().describe('Whether the PR can be merged'),
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
  mergedAt: z.string().optional().describe('Merge timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listPullRequests = SlateTool.create(spec, {
  name: 'List Pull Requests',
  key: 'list_pull_requests',
  description: `List pull requests in a repository with optional filtering by state, sort order, and pagination.`,
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
        .describe('Filter by state (default: open)'),
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
        .describe('Sort order'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      pullRequests: z.array(prOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let prs = await client.listPullRequests(ctx.input.owner, ctx.input.repo, {
      state: ctx.input.state,
      sort: ctx.input.sort,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let mapped = prs.map(pr => ({
      prNumber: pr.number,
      title: pr.title,
      body: pr.body || '',
      state: pr.state,
      htmlUrl: pr.html_url,
      authorLogin: pr.user.login,
      headBranch: pr.head.ref,
      baseBranch: pr.base.ref,
      isMerged: pr.merged,
      isMergeable: pr.mergeable,
      labels: (pr.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
      milestoneTitle: pr.milestone?.title,
      assignees: (pr.assignees || []).map(a => a.login),
      commentsCount: pr.comments,
      mergedAt: pr.merged_at || undefined,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at
    }));

    return {
      output: { pullRequests: mapped },
      message: `Found **${mapped.length}** pull requests in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let getPullRequest = SlateTool.create(spec, {
  name: 'Get Pull Request',
  key: 'get_pull_request',
  description: `Retrieve detailed information about a specific pull request including merge status, reviews, and branch info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      prNumber: z.number().describe('Pull request number')
    })
  )
  .output(prOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let pr = await client.getPullRequest(ctx.input.owner, ctx.input.repo, ctx.input.prNumber);

    return {
      output: {
        prNumber: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        htmlUrl: pr.html_url,
        authorLogin: pr.user.login,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        isMerged: pr.merged,
        isMergeable: pr.mergeable,
        labels: (pr.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: pr.milestone?.title,
        assignees: (pr.assignees || []).map(a => a.login),
        commentsCount: pr.comments,
        mergedAt: pr.merged_at || undefined,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      message: `Retrieved PR **#${pr.number}: ${pr.title}** (${pr.merged ? 'merged' : pr.state})`
    };
  })
  .build();

export let createPullRequest = SlateTool.create(spec, {
  name: 'Create Pull Request',
  key: 'create_pull_request',
  description: `Create a new pull request to merge changes from a head branch into a base branch. Supports assigning reviewers, labels, and milestones.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      title: z.string().describe('Pull request title'),
      body: z.string().optional().describe('Pull request description (supports Markdown)'),
      headBranch: z.string().describe('Source branch containing the changes'),
      baseBranch: z.string().describe('Target branch to merge into'),
      assignees: z.array(z.string()).optional().describe('Usernames to assign as reviewers'),
      labelIds: z.array(z.number()).optional().describe('Label IDs to attach'),
      milestoneId: z.number().optional().describe('Milestone ID to assign')
    })
  )
  .output(prOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let pr = await client.createPullRequest(ctx.input.owner, ctx.input.repo, {
      title: ctx.input.title,
      body: ctx.input.body,
      head: ctx.input.headBranch,
      base: ctx.input.baseBranch,
      assignees: ctx.input.assignees,
      labels: ctx.input.labelIds,
      milestone: ctx.input.milestoneId
    });

    return {
      output: {
        prNumber: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        htmlUrl: pr.html_url,
        authorLogin: pr.user.login,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        isMerged: pr.merged,
        isMergeable: pr.mergeable,
        labels: (pr.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: pr.milestone?.title,
        assignees: (pr.assignees || []).map(a => a.login),
        commentsCount: pr.comments,
        mergedAt: pr.merged_at || undefined,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      message: `Created PR **#${pr.number}: ${pr.title}** (${pr.head.ref} → ${pr.base.ref})`
    };
  })
  .build();

export let updatePullRequest = SlateTool.create(spec, {
  name: 'Update Pull Request',
  key: 'update_pull_request',
  description: `Update an existing pull request's title, description, state, assignees, or base branch. Can be used to close or reopen pull requests.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      prNumber: z.number().describe('Pull request number'),
      title: z.string().optional().describe('New title'),
      body: z.string().optional().describe('New description'),
      state: z.enum(['open', 'closed']).optional().describe('Set PR state'),
      assignees: z.array(z.string()).optional().describe('Replace assignees'),
      baseBranch: z.string().optional().describe('Change the target branch')
    })
  )
  .output(prOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let pr = await client.updatePullRequest(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.prNumber,
      {
        title: ctx.input.title,
        body: ctx.input.body,
        state: ctx.input.state,
        assignees: ctx.input.assignees,
        base: ctx.input.baseBranch
      }
    );

    return {
      output: {
        prNumber: pr.number,
        title: pr.title,
        body: pr.body || '',
        state: pr.state,
        htmlUrl: pr.html_url,
        authorLogin: pr.user.login,
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        isMerged: pr.merged,
        isMergeable: pr.mergeable,
        labels: (pr.labels || []).map(l => ({ labelId: l.id, name: l.name, color: l.color })),
        milestoneTitle: pr.milestone?.title,
        assignees: (pr.assignees || []).map(a => a.login),
        commentsCount: pr.comments,
        mergedAt: pr.merged_at || undefined,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      message: `Updated PR **#${pr.number}: ${pr.title}** (${pr.state})`
    };
  })
  .build();

export let mergePullRequest = SlateTool.create(spec, {
  name: 'Merge Pull Request',
  key: 'merge_pull_request',
  description: `Merge a pull request using the specified merge strategy. Supports merge commit, rebase, squash, and rebase-merge methods. Optionally deletes the source branch after merging.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      prNumber: z.number().describe('Pull request number'),
      mergeMethod: z
        .enum(['merge', 'rebase', 'rebase-merge', 'squash', 'manually-merged'])
        .optional()
        .describe('Merge strategy (default: merge)'),
      mergeMessage: z.string().optional().describe('Custom merge commit message'),
      deleteBranchAfterMerge: z
        .boolean()
        .optional()
        .describe('Delete source branch after merge')
    })
  )
  .output(
    z.object({
      merged: z.boolean().describe('Whether the PR was merged')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.mergePullRequest(ctx.input.owner, ctx.input.repo, ctx.input.prNumber, {
      mergeMethod: ctx.input.mergeMethod,
      mergeCommitMessage: ctx.input.mergeMessage,
      deleteBranchAfterMerge: ctx.input.deleteBranchAfterMerge
    });

    return {
      output: { merged: true },
      message: `Merged PR **#${ctx.input.prNumber}** via ${ctx.input.mergeMethod || 'merge'}`
    };
  })
  .build();
