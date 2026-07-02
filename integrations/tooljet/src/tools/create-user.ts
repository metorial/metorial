import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let workspaceAssignmentSchema = z.object({
  workspaceName: z.string().describe('Name of the workspace to assign the user to'),
  workspaceId: z
    .string()
    .optional()
    .describe('ID of the workspace (optional, can use name instead)'),
  status: z
    .enum(['active', 'archived'])
    .optional()
    .default('active')
    .describe('User status in this workspace'),
  groups: z
    .array(
      z.object({
        groupName: z.string().describe('Name of the group to add the user to'),
        groupId: z.string().optional().describe('ID of the group (optional)')
      })
    )
    .optional()
    .describe('Groups to assign the user to within this workspace')
});

export let createUser = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user on the ToolJet instance with name, email, optional password, and workspace assignments including group memberships.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Full name of the new user'),
      email: z.string().describe('Email address of the new user'),
      password: z.string().optional().describe('Password for the new user (5-100 characters)'),
      status: z
        .enum(['active', 'archived'])
        .optional()
        .default('active')
        .describe('Initial status of the user'),
      workspaces: z
        .array(workspaceAssignmentSchema)
        .optional()
        .describe('Workspaces to assign the user to')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('UUID of the created user'),
      name: z.string().describe('Name of the created user'),
      email: z.string().describe('Email of the created user'),
      status: z.string().describe('Status of the created user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let body: any = {
      name: ctx.input.name,
      email: ctx.input.email,
      status: ctx.input.status
    };

    if (ctx.input.password) {
      body.password = ctx.input.password;
    }

    if (ctx.input.workspaces) {
      body.workspaces = ctx.input.workspaces.map(w => ({
        id: w.workspaceId,
        name: w.workspaceName,
        status: w.status ?? 'active',
        groups: w.groups?.map(g => ({
          id: g.groupId,
          name: g.groupName
        }))
      }));
    }

    let result = await client.createUser(body);

    return {
      output: {
        userId: result?.id,
        name: ctx.input.name,
        email: ctx.input.email,
        status: ctx.input.status ?? 'active'
      },
      message: `Created user **${ctx.input.name}** (${ctx.input.email}) with status **${ctx.input.status ?? 'active'}**.`
    };
  })
  .build();
