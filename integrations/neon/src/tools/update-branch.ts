import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeonClient } from '../lib/client';
import { neonValidationError } from '../lib/errors';
import { spec } from '../spec';
import { branchSchema, mapBranch, mapOperation, operationSchema } from './shared';

export let updateBranch = SlateTool.create(spec, {
  name: 'Update Branch',
  key: 'update_branch',
  description: `Updates a Neon branch name, protected flag, or expiration timestamp. Set expiresAt to null to remove the expiration timestamp.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the branch'),
      branchId: z.string().describe('ID of the branch to update'),
      name: z.string().optional().describe('New branch name'),
      protected: z.boolean().optional().describe('Whether the branch should be protected'),
      expiresAt: z
        .string()
        .nullable()
        .optional()
        .describe('RFC3339 expiration timestamp, or null to remove expiration')
    })
  )
  .output(
    z.object({
      branch: branchSchema.describe('Updated branch'),
      operations: z.array(operationSchema).describe('Operations created by the update')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.name === undefined &&
      ctx.input.protected === undefined &&
      ctx.input.expiresAt === undefined
    ) {
      throw neonValidationError('Provide at least one branch field to update.');
    }

    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.updateBranch(ctx.input.projectId, ctx.input.branchId, {
      name: ctx.input.name,
      protected: ctx.input.protected,
      expiresAt: ctx.input.expiresAt
    });
    let branch = mapBranch(result.branch);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: { branch, operations },
      message: `Updated branch **${branch.name}** (${branch.branchId}).`
    };
  })
  .build();

export let setDefaultBranch = SlateTool.create(spec, {
  name: 'Set Default Branch',
  key: 'set_default_branch',
  description: `Sets a branch as the default branch for a Neon project. The previous default branch is automatically unset.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the branch'),
      branchId: z.string().describe('ID of the branch to make the default')
    })
  )
  .output(
    z.object({
      branch: branchSchema.describe('Branch that is now default'),
      operations: z.array(operationSchema).describe('Operations created by the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.setDefaultBranch(ctx.input.projectId, ctx.input.branchId);
    let branch = mapBranch(result.branch);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: { branch, operations },
      message: `Set branch **${branch.name}** (${branch.branchId}) as the project default.`
    };
  })
  .build();

export let recoverBranch = SlateTool.create(spec, {
  name: 'Recover Branch',
  key: 'recover_branch',
  description: `Recovers a soft-deleted Neon branch within the deletion recovery period when branch recovery is available for the project.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project containing the deleted branch'),
      branchId: z.string().describe('ID of the soft-deleted branch to recover')
    })
  )
  .output(
    z.object({
      branch: branchSchema.describe('Recovered branch'),
      operations: z.array(operationSchema).describe('Operations created by recovery')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeonClient({ token: ctx.auth.token });
    let result = await client.recoverBranch(ctx.input.projectId, ctx.input.branchId);
    let branch = mapBranch(result.branch);
    let operations = (result.operations || []).map(mapOperation);

    return {
      output: { branch, operations },
      message: `Recovered branch **${branch.name}** (${branch.branchId}).`
    };
  })
  .build();
