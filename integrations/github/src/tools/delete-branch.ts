import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description:
    "Delete a branch from a GitHub repository, for example after its pull request is merged. The repository's default branch and protected branches cannot be deleted.",
  tags: { destructive: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branch: z
        .string()
        .describe('Branch name to delete, such as "feature/login" (without refs/heads/)')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branch: z.string().describe('Deleted branch name'),
      deleted: z.boolean().describe('Whether the branch was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let branch = ctx.input.branch.trim().replace(/^refs\/heads\//, '');
    if (!branch) {
      throw createApiServiceError('branch must be a non-empty branch name.', {
        reason: 'github_delete_branch_name_required'
      });
    }

    let client = new GitHubClient(ctx.auth);
    await client.deleteBranch(ctx.input.owner, ctx.input.repo, branch);

    return {
      output: {
        owner: ctx.input.owner,
        repo: ctx.input.repo,
        branch,
        deleted: true
      },
      message: `Deleted branch \`${branch}\` from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
