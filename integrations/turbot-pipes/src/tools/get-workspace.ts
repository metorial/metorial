import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getWorkspace = SlateTool.create(spec, {
  name: 'Get Workspace',
  key: 'get_workspace',
  description: `Retrieve detailed information about a specific workspace including its state, instance type, database configuration, and connection details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceHandle: z.string().describe('Handle of the workspace to retrieve'),
      ownerHandle: z
        .string()
        .optional()
        .describe(
          'Handle of the workspace owner (user or org). If omitted, the authenticated user is used.'
        ),
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
      identityId: z.string().optional().describe('Owner identity ID'),
      state: z.string().optional().describe('Current workspace state'),
      desiredState: z.string().optional().describe('Desired workspace state'),
      instanceType: z.string().optional().describe('Workspace instance type'),
      dbVolumeSizeBytes: z.number().optional().describe('Database volume size in bytes'),
      databaseName: z.string().optional().describe('Database name for connections'),
      host: z.string().optional().describe('Database host for connections'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      versionId: z.number().optional().describe('Version ID for optimistic concurrency')
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
      workspace = await client.getOrgWorkspace(ownerHandle, ctx.input.workspaceHandle);
    } else {
      workspace = await client.getUserWorkspace(ownerHandle, ctx.input.workspaceHandle);
    }

    return {
      output: workspace,
      message: `Workspace **${workspace.handle}** is in state **${workspace.state || 'unknown'}** (instance type: ${workspace.instanceType || 'unknown'}).`
    };
  })
  .build();
