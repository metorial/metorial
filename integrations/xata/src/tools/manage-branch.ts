import { SlateTool } from 'slates';
import { z } from 'zod';
import { XataWorkspaceClient } from '../lib/client';
import { spec } from '../spec';

export let listBranches = SlateTool.create(spec, {
  name: 'List Branches',
  key: 'list_branches',
  description: `List all branches of a Xata database. Returns branch names, creation times, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database')
    })
  )
  .output(
    z.object({
      branches: z
        .array(
          z.object({
            branchName: z.string().describe('Name of the branch'),
            createdAt: z.string().optional().describe('When the branch was created'),
            metadata: z.any().optional().describe('Branch metadata')
          })
        )
        .describe('List of database branches')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let result = await client.listBranches(ctx.input.databaseName);
    let branches = (result.branches || []).map((b: any) => ({
      branchName: b.name,
      createdAt: b.createdAt,
      metadata: b.metadata
    }));

    return {
      output: { branches },
      message: `Found **${branches.length}** branch(es) in **${ctx.input.databaseName}**.`
    };
  })
  .build();

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Create a new database branch using Xata's copy-on-write branching. The new branch shares storage with its parent and only stores differences. Dev branches can scale to zero when inactive.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name for the new branch'),
      fromBranch: z
        .string()
        .optional()
        .describe('Parent branch to create from (default: main)')
    })
  )
  .output(
    z.object({
      branchName: z.string().describe('Name of the created branch'),
      status: z.string().describe('Creation status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let result = await client.createBranch(
      ctx.input.databaseName,
      ctx.input.branchName,
      ctx.input.fromBranch ? { from: ctx.input.fromBranch } : undefined
    );

    return {
      output: {
        branchName: ctx.input.branchName,
        status: result.status || 'created'
      },
      message: `Created branch **${ctx.input.branchName}** in **${ctx.input.databaseName}**${ctx.input.fromBranch ? ` from **${ctx.input.fromBranch}**` : ''}.`
    };
  })
  .build();

export let deleteBranch = SlateTool.create(spec, {
  name: 'Delete Branch',
  key: 'delete_branch',
  description: `Delete a database branch. This removes the branch and any data unique to it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the branch was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    await client.deleteBranch(ctx.input.databaseName, ctx.input.branchName);

    return {
      output: { deleted: true },
      message: `Deleted branch **${ctx.input.branchName}** from **${ctx.input.databaseName}**.`
    };
  })
  .build();

export let getBranch = SlateTool.create(spec, {
  name: 'Get Branch Details',
  key: 'get_branch',
  description: `Get detailed information about a specific database branch, including its schema, tables, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch')
    })
  )
  .output(
    z.object({
      branchName: z.string().describe('Name of the branch'),
      metadata: z.any().optional().describe('Branch metadata'),
      schema: z.any().optional().describe('Branch schema including tables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new XataWorkspaceClient({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId || '',
      region: ctx.config.region
    });

    let result = await client.getBranch(ctx.input.databaseName, ctx.input.branchName);

    return {
      output: {
        branchName: ctx.input.branchName,
        metadata: result.metadata,
        schema: result.schema
      },
      message: `Retrieved details for branch **${ctx.input.branchName}** in **${ctx.input.databaseName}**.`
    };
  })
  .build();
