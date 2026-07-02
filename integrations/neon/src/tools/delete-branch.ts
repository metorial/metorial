import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { spec } from '../spec';

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description: `Deletes a branch from a Neon project. This also deletes all databases, roles, and compute endpoints associated with the branch.`,
  constraints: [
    'The default (primary) branch cannot be deleted.',
    'All endpoints on the branch will be removed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the branch'),
      branchId: z.string().describe('ID of the branch to delete')
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('ID of the deleted branch'),
      name: z.string().describe('Name of the deleted branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.deleteBranch(ctx.input.projectId, ctx.input.branchId);
    let b = result.branch;

    return {
      output: {
        branchId: b.id,
        name: b.name
      },
      message: `Deleted branch **${b.name}** (${b.id}).`
    };
  })
  .build();
