import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bitbucketServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBranchesTool = SlateTool.create(spec, {
  name: 'Manage Branches',
  key: 'manage_branches',
  description: `List, create, or delete branches in a repository.
Use action "list" to browse branches, "create" to create a new branch from a target commit/branch, or "delete" to remove a branch.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      branchName: z.string().optional().describe('Branch name (required for create/delete)'),
      target: z
        .string()
        .optional()
        .describe('Commit hash or branch to create from (required for create)'),
      query: z
        .string()
        .optional()
        .describe('Filter query for listing (e.g. name ~ "feature")'),
      sort: z.string().optional().describe('Sort field for listing'),
      page: z.number().optional().describe('Page number for listing'),
      pageLen: z.number().optional().describe('Results per page for listing')
    })
  )
  .output(
    z.object({
      branches: z
        .array(
          z.object({
            name: z.string(),
            targetHash: z.string().optional(),
            targetMessage: z.string().optional(),
            targetAuthor: z.string().optional(),
            targetDate: z.string().optional()
          })
        )
        .optional(),
      createdBranch: z
        .object({
          name: z.string(),
          targetHash: z.string().optional()
        })
        .optional(),
      deleted: z.boolean().optional(),
      hasNextPage: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    if (ctx.input.action === 'list') {
      let result = await client.listBranches(ctx.input.repoSlug, {
        query: ctx.input.query,
        sort: ctx.input.sort,
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      });

      let branches = (result.values || []).map((b: any) => ({
        name: b.name,
        targetHash: b.target?.hash || undefined,
        targetMessage: b.target?.message || undefined,
        targetAuthor: b.target?.author?.user?.display_name || undefined,
        targetDate: b.target?.date || undefined
      }));

      return {
        output: { branches, hasNextPage: !!result.next },
        message: `Found **${branches.length}** branches.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.branchName || !ctx.input.target) {
        throw bitbucketServiceError('branchName and target are required to create a branch');
      }

      let branch = await client.createBranch(ctx.input.repoSlug, {
        name: ctx.input.branchName,
        target: { hash: ctx.input.target }
      });

      return {
        output: {
          createdBranch: {
            name: branch.name,
            targetHash: branch.target?.hash || undefined
          }
        },
        message: `Created branch **${branch.name}**.`
      };
    }

    // delete
    if (!ctx.input.branchName) {
      throw bitbucketServiceError('branchName is required to delete a branch');
    }

    await client.deleteBranch(ctx.input.repoSlug, ctx.input.branchName);

    return {
      output: { deleted: true },
      message: `Deleted branch **${ctx.input.branchName}**.`
    };
  })
  .build();
