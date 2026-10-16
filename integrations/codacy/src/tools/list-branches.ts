import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Repository Branches',
  key: 'list_branches',
  description:
    'Discover repository branches and their enabled/default state. Use an enabled branch name with file, commit, issue, or repository analysis tools.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Repository name from list_repositories.'),
      enabled: z.boolean().optional().describe('Filter enabled or disabled branches.'),
      search: z.string().optional().describe('Filter branches by name.'),
      cursor: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(
    z.object({
      branches: z.array(
        z
          .object({
            id: z.number(),
            name: z.string(),
            isDefault: z.boolean(),
            isEnabled: z.boolean(),
            branchType: z.string(),
            lastCommit: z.string().optional(),
            lastUpdated: z.string().optional()
          })
          .passthrough()
      ),
      cursor: z.string().optional(),
      total: z.number().optional(),
      raw: z.unknown()
    })
  )
  .handleInvocation(async ctx => {
    let { repositoryName, ...params } = ctx.input;
    let response = await createClient(ctx).listBranches(repositoryName, params);
    return {
      output: {
        branches: response.data,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total,
        raw: response
      },
      message: 'Retrieved repository branches.'
    };
  })
  .build();
