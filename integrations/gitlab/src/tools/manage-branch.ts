import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageBranch = SlateTool.create(spec, {
  name: 'Manage Branch',
  key: 'manage_branch',
  description: `List, create, or delete branches in a project repository. Use "list" to search existing branches, "create" to create a new branch from a ref, or "delete" to remove a branch.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'delete']).describe('Operation to perform'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      branchName: z.string().optional().describe('Branch name (required for create/delete)'),
      ref: z
        .string()
        .optional()
        .describe('Source ref to create branch from (required for create)'),
      search: z.string().optional().describe('Search term to filter branches (list only)'),
      perPage: z.number().optional().describe('Results per page (list only)'),
      page: z.number().optional().describe('Page number (list only)')
    })
  )
  .output(
    z.object({
      branches: z
        .array(
          z.object({
            branchName: z.string().describe('Branch name'),
            commitSha: z.string().describe('Latest commit SHA'),
            commitMessage: z.string().describe('Latest commit message'),
            isProtected: z.boolean().describe('Whether the branch is protected'),
            isDefault: z.boolean().describe('Whether this is the default branch'),
            webUrl: z.string().nullable().describe('URL to the branch')
          })
        )
        .optional()
        .describe('List of branches (list action)'),
      branch: z
        .object({
          branchName: z.string().describe('Branch name'),
          commitSha: z.string().describe('Latest commit SHA'),
          commitMessage: z.string().describe('Latest commit message'),
          isProtected: z.boolean().describe('Whether the branch is protected'),
          isDefault: z.boolean().describe('Whether this is the default branch')
        })
        .optional()
        .describe('Created or deleted branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    switch (ctx.input.action) {
      case 'list': {
        let branches = await client.listBranches(ctx.input.projectId, {
          search: ctx.input.search,
          perPage: ctx.input.perPage,
          page: ctx.input.page
        });

        let mapped = branches.map((b: any) => ({
          branchName: b.name,
          commitSha: b.commit?.id || '',
          commitMessage: b.commit?.message || '',
          isProtected: b.protected || false,
          isDefault: b.default || false,
          webUrl: b.web_url || null
        }));

        return {
          output: { branches: mapped },
          message: `Found **${mapped.length}** branches${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}`
        };
      }
      case 'create': {
        if (!ctx.input.branchName) throw gitLabServiceError('Branch name is required');
        if (!ctx.input.ref)
          throw gitLabServiceError('Source ref is required to create a branch');
        let branch = await client.createBranch(
          ctx.input.projectId,
          ctx.input.branchName,
          ctx.input.ref
        );
        return {
          output: {
            branch: {
              branchName: branch.name,
              commitSha: branch.commit?.id || '',
              commitMessage: branch.commit?.message || '',
              isProtected: branch.protected || false,
              isDefault: branch.default || false
            }
          },
          message: `Created branch \`${branch.name}\` from \`${ctx.input.ref}\``
        };
      }
      case 'delete': {
        if (!ctx.input.branchName) throw gitLabServiceError('Branch name is required');
        await client.deleteBranch(ctx.input.projectId, ctx.input.branchName);
        return {
          output: {
            branch: {
              branchName: ctx.input.branchName,
              commitSha: '',
              commitMessage: '',
              isProtected: false,
              isDefault: false
            }
          },
          message: `Deleted branch \`${ctx.input.branchName}\``
        };
      }
    }
  })
  .build();
