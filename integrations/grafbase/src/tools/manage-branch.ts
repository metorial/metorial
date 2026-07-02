import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Creates a new branch on a federated graph. Branches enable different environments (e.g., staging, development) with independent schema registries and configurations.`,
  instructions: [
    'Use "Get Graph" first to obtain the graph ID.',
    'The production branch (typically "main") is created automatically with the graph.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the graph to create the branch on'),
      branchName: z.string().describe('Name for the new branch')
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('ID of the created branch'),
      name: z.string().describe('Name of the created branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let branch = await client.createBranch({
      graphId: ctx.input.graphId,
      name: ctx.input.branchName
    });

    return {
      output: {
        branchId: branch.id,
        name: branch.name
      },
      message: `Created branch **${branch.name}** (ID: ${branch.id}).`
    };
  })
  .build();

export let getBranch = SlateTool.create(spec, {
  name: 'Get Branch',
  key: 'get_branch',
  description: `Retrieves details about a specific branch of a federated graph, including its configuration and operation check settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountSlug: z.string().describe('Account slug (personal or organization)'),
      graphSlug: z.string().describe('Graph slug'),
      branchName: z.string().describe('Name of the branch to retrieve')
    })
  )
  .output(
    z.object({
      branchId: z.string().describe('ID of the branch'),
      name: z.string().describe('Name of the branch'),
      operationChecksEnabled: z
        .boolean()
        .optional()
        .describe('Whether operation checks are enabled for this branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let branch = await client.getBranch(
      ctx.input.accountSlug,
      ctx.input.graphSlug,
      ctx.input.branchName
    );

    if (!branch) {
      throw new Error('Branch not found.');
    }

    return {
      output: {
        branchId: branch.id,
        name: branch.name,
        operationChecksEnabled: branch.operationChecksEnabled
      },
      message: `Retrieved branch **${branch.name}** (operation checks: ${branch.operationChecksEnabled ? 'enabled' : 'disabled'}).`
    };
  })
  .build();

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description: `Deletes a branch from a federated graph. The production branch (typically "main") cannot be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountSlug: z.string().describe('Account slug (personal or organization)'),
      graphSlug: z.string().describe('Graph slug'),
      branchName: z.string().describe('Name of the branch to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the branch was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    await client.deleteBranch(
      ctx.input.accountSlug,
      ctx.input.graphSlug,
      ctx.input.branchName
    );

    return {
      output: {
        deleted: true
      },
      message: `Branch **${ctx.input.branchName}** on ${ctx.input.accountSlug}/${ctx.input.graphSlug} has been deleted.`
    };
  })
  .build();
