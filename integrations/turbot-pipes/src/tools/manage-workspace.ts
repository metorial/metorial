import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createWorkspace = SlateTool.create(spec, {
  name: 'Create Workspace',
  key: 'create_workspace',
  description: `Create a new Turbot Pipes workspace. The workspace provides a dedicated Steampipe database, Powerpipe server for dashboards and benchmarks, and Flowpipe server for pipelines.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      handle: z
        .string()
        .describe('Unique handle for the workspace (lowercase alphanumeric, max 23 chars)'),
      instanceType: z
        .enum(['db1.shared', 'db1.small', 'db1.medium'])
        .optional()
        .describe('Instance type for the workspace database'),
      desiredState: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Initial desired state'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Unique workspace identifier'),
      handle: z.string().describe('Workspace handle'),
      state: z.string().optional().describe('Current workspace state'),
      desiredState: z.string().optional().describe('Desired workspace state'),
      instanceType: z.string().optional().describe('Workspace instance type'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let workspace: any;
    if (ctx.input.ownerType === 'org') {
      workspace = await client.createOrgWorkspace(ownerHandle, {
        handle: ctx.input.handle,
        instanceType: ctx.input.instanceType,
        desiredState: ctx.input.desiredState
      });
    } else {
      workspace = await client.createUserWorkspace(ownerHandle, {
        handle: ctx.input.handle,
        instanceType: ctx.input.instanceType,
        desiredState: ctx.input.desiredState
      });
    }

    return {
      output: workspace,
      message: `Created workspace **${workspace.handle}** (${workspace.instanceType || 'default'}).`
    };
  })
  .build();

export let updateWorkspace = SlateTool.create(spec, {
  name: 'Update Workspace',
  key: 'update_workspace',
  description: `Update a workspace's configuration including handle, instance type, desired state, and database volume size.`,
  instructions: [
    'You can enable or disable a workspace by setting desiredState to "enabled" or "disabled".'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Current handle of the workspace to update'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization'),
      handle: z.string().optional().describe('New handle for the workspace'),
      instanceType: z
        .enum(['db1.shared', 'db1.small', 'db1.medium'])
        .optional()
        .describe('New instance type'),
      desiredState: z.enum(['enabled', 'disabled']).optional().describe('New desired state'),
      dbVolumeSizeBytes: z.number().optional().describe('New database volume size in bytes')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Unique workspace identifier'),
      handle: z.string().describe('Workspace handle'),
      state: z.string().optional().describe('Current workspace state'),
      desiredState: z.string().optional().describe('Desired workspace state'),
      instanceType: z.string().optional().describe('Workspace instance type'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let updates = {
      handle: ctx.input.handle,
      instanceType: ctx.input.instanceType,
      desiredState: ctx.input.desiredState,
      dbVolumeSizeBytes: ctx.input.dbVolumeSizeBytes
    };

    let workspace: any;
    if (ctx.input.ownerType === 'org') {
      workspace = await client.updateOrgWorkspace(
        ownerHandle,
        ctx.input.workspaceHandle,
        updates
      );
    } else {
      workspace = await client.updateUserWorkspace(
        ownerHandle,
        ctx.input.workspaceHandle,
        updates
      );
    }

    return {
      output: workspace,
      message: `Updated workspace **${workspace.handle}**.`
    };
  })
  .build();

export let deleteWorkspace = SlateTool.create(spec, {
  name: 'Delete Workspace',
  key: 'delete_workspace',
  description: `Permanently delete a workspace and all its associated resources including database, connections, pipelines, and snapshots.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace to delete'),
      ownerHandle: z
        .string()
        .optional()
        .describe('Owner handle (user or org). Defaults to the authenticated user.'),
      ownerType: z
        .enum(['user', 'org'])
        .default('user')
        .describe('Whether the owner is a user or organization')
    })
  )
  .output(
    z.object({
      workspaceId: z.string().describe('Unique workspace identifier'),
      handle: z.string().describe('Deleted workspace handle')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let ownerHandle = ctx.input.ownerHandle;
    if (!ownerHandle) {
      let actor = await client.getActor();
      ownerHandle = actor.handle;
    }

    let workspace: any;
    if (ctx.input.ownerType === 'org') {
      workspace = await client.deleteOrgWorkspace(ownerHandle, ctx.input.workspaceHandle);
    } else {
      workspace = await client.deleteUserWorkspace(ownerHandle, ctx.input.workspaceHandle);
    }

    return {
      output: workspace,
      message: `Deleted workspace **${workspace.handle}**.`
    };
  })
  .build();
