import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let branchSchema = z.object({
  name: z.string().describe('Branch name'),
  commitSha: z.string().describe('Latest commit SHA'),
  commitMessage: z.string().describe('Latest commit message'),
  isProtected: z.boolean().describe('Whether the branch is protected')
});

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `List all branches of a repository with their latest commit info and protection status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      branches: z.array(branchSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let branches = await client.listBranches(ctx.input.owner, ctx.input.repo, {
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        branches: branches.map(b => ({
          name: b.name,
          commitSha: b.commit.id,
          commitMessage: b.commit.message,
          isProtected: b.protected
        }))
      },
      message: `Found **${branches.length}** branches in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Create a new branch in a repository from an existing branch or the default branch.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branchName: z.string().describe('Name for the new branch'),
      sourceBranch: z
        .string()
        .optional()
        .describe('Source branch to create from; defaults to the repository default branch')
    })
  )
  .output(branchSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let b = await client.createBranch(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.branchName,
      ctx.input.sourceBranch
    );

    return {
      output: {
        name: b.name,
        commitSha: b.commit.id,
        commitMessage: b.commit.message,
        isProtected: b.protected
      },
      message: `Created branch **${b.name}** in **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description: `Delete a branch from a repository. Cannot delete protected or default branches.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      branchName: z.string().describe('Name of the branch to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the branch was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.deleteBranch(ctx.input.owner, ctx.input.repo, ctx.input.branchName);

    return {
      output: { deleted: true },
      message: `Deleted branch **${ctx.input.branchName}** from **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
