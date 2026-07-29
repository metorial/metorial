import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubPullRequestWritesApi } from '../lib/github-pull-request-writes';
import { spec } from '../spec';

export let managePullRequest = SlateTool.create(spec, {
  name: 'Manage Pull Request',
  key: 'manage_pull_request',
  description: `Create a new pull request or update an existing one.
When creating: provide head branch, base branch, and title. Reviewers may be GitHub usernames or ORG/team-slug teams.
When updating: provide the pull request number along with fields to change, including draft state and reviewers.`,
  instructions: [
    'To create a new PR, omit pullNumber and provide head, base, and title.',
    'To update an existing PR, provide pullNumber along with fields to change.',
    'To close a PR without merging, set state to "closed".',
    'Use maintainer_can_modify for the official GitHub contract; maintainerCanModify remains supported for existing calls.'
  ],
  tags: { destructive: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().optional().describe('Pull request number to update'),
      title: z.string().optional().describe('PR title when creating; new title when updating'),
      body: z.string().optional().describe('PR description'),
      head: z.string().optional().describe('Branch containing changes'),
      base: z.string().optional().describe('Branch to merge into or new base branch name'),
      draft: z
        .boolean()
        .optional()
        .describe(
          'Create as a draft PR, or mark an existing pull request as draft (true) or ready for review (false)'
        ),
      state: z.enum(['open', 'closed']).optional().describe('New state for an existing PR'),
      maintainer_can_modify: z.boolean().optional().describe('Allow maintainer edits'),
      reviewers: z
        .array(z.string())
        .optional()
        .describe('GitHub usernames or ORG/team-slug team reviewers to request reviews from'),
      maintainerCanModify: z
        .boolean()
        .optional()
        .describe(
          'Legacy alias for maintainer_can_modify. Allow maintainers to push to the head branch.'
        )
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
    let input = ctx.input;
    if (
      input.maintainer_can_modify !== undefined &&
      input.maintainerCanModify !== undefined &&
      input.maintainer_can_modify !== input.maintainerCanModify
    ) {
      throw createApiServiceError(
        'maintainer_can_modify and maintainerCanModify must match when both are provided.',
        { reason: 'github_pull_request_maintainer_setting_conflict' }
      );
    }
    let maintainerCanModify = input.maintainer_can_modify ?? input.maintainerCanModify;
    let api = new GitHubPullRequestWritesApi(ctx.auth);
    let pullRequest: Record<string, any>;

    if (input.pullNumber !== undefined) {
      let hasUpdate =
        input.title !== undefined ||
        input.body !== undefined ||
        input.state !== undefined ||
        input.base !== undefined ||
        input.draft !== undefined ||
        maintainerCanModify !== undefined ||
        (input.reviewers?.length ?? 0) > 0;
      if (!hasUpdate) {
        throw createApiServiceError('No update parameters provided.', {
          reason: 'github_pull_request_update_empty'
        });
      }
      pullRequest = await api.updatePullRequest(input.owner, input.repo, input.pullNumber, {
        title: input.title,
        body: input.body,
        state: input.state,
        base: input.base,
        draft: input.draft,
        maintainerCanModify,
        reviewers: input.reviewers
      });
    } else {
      if (!input.title || !input.head || !input.base) {
        throw createApiServiceError(
          'title, head, and base are required when creating a pull request.',
          { reason: 'github_create_pull_request_fields_required' }
        );
      }
      if (input.state !== undefined) {
        throw createApiServiceError('state is only supported when updating a pull request.', {
          reason: 'github_create_pull_request_state_unsupported'
        });
      }
      pullRequest = await api.createPullRequest(input.owner, input.repo, {
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body,
        draft: input.draft,
        maintainerCanModify,
        reviewers: input.reviewers
      });
    }

    let output = {
      pullNumber: pullRequest.number,
      pullRequestId: pullRequest.id,
      title: pullRequest.title,
      state: pullRequest.state,
      htmlUrl: pullRequest.html_url,
      author: pullRequest.user?.login ?? '',
      head: pullRequest.head?.ref ?? '',
      base: pullRequest.base?.ref ?? '',
      draft: Boolean(pullRequest.draft),
      merged: Boolean(pullRequest.merged),
      mergeable:
        pullRequest.mergeable === undefined || pullRequest.mergeable === null
          ? null
          : Boolean(pullRequest.mergeable),
      createdAt: pullRequest.created_at ?? '',
      updatedAt: pullRequest.updated_at ?? ''
    };
    return {
      output,
      message:
        input.pullNumber !== undefined
          ? `Updated PR **#${output.pullNumber}** in **${input.owner}/${input.repo}** — ${output.htmlUrl}`
          : `Created PR **#${output.pullNumber}**: "${output.title}" (${output.head} → ${output.base}) — ${output.htmlUrl}`
    };
  })
  .build();
