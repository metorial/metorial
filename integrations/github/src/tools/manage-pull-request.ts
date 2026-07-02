import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let managePullRequest = SlateTool.create(spec, {
  name: 'Manage Pull Request',
  key: 'manage_pull_request',
  description: `Create a new pull request or update an existing one.
When creating: provide head branch, base branch, and title.
When updating: provide the pull request number along with fields to change.`,
  instructions: [
    'To create a new PR, omit pullNumber and provide head, base, and title.',
    'To update an existing PR, provide pullNumber along with fields to change.',
    'To close a PR without merging, set state to "closed".'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      pullNumber: z
        .number()
        .optional()
        .describe('Pull request number to update. Omit to create a new PR.'),
      title: z.string().optional().describe('PR title (required when creating)'),
      body: z.string().optional().describe('PR description in Markdown'),
      head: z
        .string()
        .optional()
        .describe(
          'Head branch (required when creating). Use "fork_owner:branch" for cross-repo PRs.'
        ),
      base: z
        .string()
        .optional()
        .describe('Base branch to merge into (required when creating)'),
      draft: z.boolean().optional().describe('Create as draft PR'),
      state: z.enum(['open', 'closed']).optional().describe('PR state (only for updates)'),
      maintainerCanModify: z
        .boolean()
        .optional()
        .describe('Allow maintainers to push to the head branch')
    })
  )
  .output(
    z.object({
      pullNumber: z.number().describe('Pull request number'),
      pullRequestId: z.number().describe('Unique PR ID'),
      title: z.string().describe('PR title'),
      state: z.string().describe('PR state'),
      htmlUrl: z.string().describe('URL to the PR on GitHub'),
      author: z.string().describe('PR author login'),
      head: z.string().describe('Head branch ref'),
      base: z.string().describe('Base branch ref'),
      draft: z.boolean().describe('Whether the PR is a draft'),
      merged: z.boolean().describe('Whether the PR has been merged'),
      mergeable: z.boolean().nullable().describe('Whether the PR is mergeable'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, pullNumber, ...data } = ctx.input;
    let pr: any;

    if (pullNumber) {
      pr = await client.updatePullRequest(owner, repo, pullNumber, {
        title: data.title,
        body: data.body,
        state: data.state,
        base: data.base,
        maintainerCanModify: data.maintainerCanModify
      });
    } else {
      if (!data.title || !data.head || !data.base) {
        throw new Error('title, head, and base are required when creating a pull request.');
      }
      pr = await client.createPullRequest(owner, repo, {
        title: data.title,
        head: data.head,
        base: data.base,
        body: data.body,
        draft: data.draft,
        maintainerCanModify: data.maintainerCanModify
      });
    }

    return {
      output: {
        pullNumber: pr.number,
        pullRequestId: pr.id,
        title: pr.title,
        state: pr.state,
        htmlUrl: pr.html_url,
        author: pr.user.login,
        head: pr.head.ref,
        base: pr.base.ref,
        draft: pr.draft,
        merged: pr.merged,
        mergeable: pr.mergeable ?? null,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at
      },
      message: pullNumber
        ? `Updated PR **#${pr.number}** in **${owner}/${repo}** — ${pr.html_url}`
        : `Created PR **#${pr.number}**: "${pr.title}" (${pr.head.ref} → ${pr.base.ref}) — ${pr.html_url}`
    };
  })
  .build();
