import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let groupSchema = z.object({
  groupId: z.string().describe('ID of the group'),
  groupName: z.string().describe('Name of the group')
});

let workspaceSchema = z.object({
  workspaceId: z.string().describe('ID of the workspace'),
  workspaceName: z.string().describe('Name of the workspace'),
  status: z.string().describe('Status of the user in the workspace'),
  groups: z
    .array(groupSchema)
    .optional()
    .describe('Groups the user belongs to in this workspace')
});

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Look up a specific user by their UUID or email address. Returns the user's details including workspace memberships and group assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      identifier: z.string().describe('User UUID or email address to look up')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('UUID of the user'),
      name: z.string().describe('Full name of the user'),
      email: z.string().describe('Email address of the user'),
      status: z.string().describe('User status (active or archived)'),
      workspaces: z
        .array(workspaceSchema)
        .optional()
        .describe('Workspaces the user belongs to')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let u = await client.getUser(ctx.input.identifier);

    let output = {
      userId: u.id,
      name: u.name,
      email: u.email,
      status: u.status,
      workspaces: u.workspaces?.map((w: any) => ({
        workspaceId: w.id,
        workspaceName: w.name,
        status: w.status,
        groups: (w.groups ?? w.userGroups)?.map((g: any) => ({
          groupId: g.id,
          groupName: g.name
        }))
      }))
    };

    return {
      output,
      message: `Found user **${output.name}** (${output.email}) with status **${output.status}**.`
    };
  })
  .build();
