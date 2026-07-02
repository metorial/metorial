import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';
import { branchSchema, mapBranch } from './shared';

export let getBranch = SlateTool.create(spec, {
  name: 'Get Branch',
  key: 'get_branch',
  description: `Retrieves details for a specific Neon branch, including its parent, state, default/protected flags, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the branch'),
      branchId: z.string().describe('ID of the branch to retrieve')
    })
  )
  .output(branchSchema)
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.getBranch(ctx.input.projectId, ctx.input.branchId);
    let branch = mapBranch(result.branch);

    return {
      output: branch,
      message: `Retrieved branch **${branch.name}** (${branch.branchId}).`
    };
  })
  .build();
