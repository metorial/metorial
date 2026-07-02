import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let zeroObjectId = '0000000000000000000000000000000000000000';

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Creates a new branch in a repository from a specified source commit SHA. The source commit is typically the HEAD of an existing branch.`,
  instructions: [
    'The sourceObjectId must be a full 40-character commit SHA. Use "List Branches" to get the SHA of the source branch.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      branchName: z
        .string()
        .describe('Name for the new branch (without "refs/heads/" prefix)'),
      sourceObjectId: z.string().describe('Commit SHA to create the branch from')
    })
  )
  .output(
    z.object({
      name: z.string().describe('Full ref name of the created branch'),
      objectId: z.string().describe('Commit SHA the branch points to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let refName = ctx.input.branchName.startsWith('refs/')
      ? ctx.input.branchName
      : `refs/heads/${ctx.input.branchName}`;

    let results = await client.updateRefs(ctx.input.repositoryId, [
      {
        name: refName,
        oldObjectId: zeroObjectId,
        newObjectId: ctx.input.sourceObjectId
      }
    ]);

    let ref = results[0]!;
    let objectId = typeof ref.newObjectId === 'string' ? ref.newObjectId : ref.objectId;
    return {
      output: {
        name: ref.name,
        objectId
      },
      message: `Created branch **${ctx.input.branchName}** from commit \`${ctx.input.sourceObjectId.substring(0, 8)}\`.`
    };
  })
  .build();

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description: `Deletes a branch from a repository. Requires the current commit SHA of the branch to ensure you're deleting the correct ref.`,
  instructions: [
    'Use "List Branches" to get the current objectId of the branch you want to delete.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      branchName: z
        .string()
        .describe('Name of the branch to delete (without "refs/heads/" prefix)'),
      objectId: z.string().describe('Current commit SHA the branch points to')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the branch was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let refName = ctx.input.branchName.startsWith('refs/')
      ? ctx.input.branchName
      : `refs/heads/${ctx.input.branchName}`;

    await client.updateRefs(ctx.input.repositoryId, [
      {
        name: refName,
        oldObjectId: ctx.input.objectId,
        newObjectId: zeroObjectId
      }
    ]);

    return {
      output: { deleted: true },
      message: `Deleted branch **${ctx.input.branchName}**.`
    };
  })
  .build();
