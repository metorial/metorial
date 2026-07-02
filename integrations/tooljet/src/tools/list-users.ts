import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userGroupSchema = z.object({
  groupId: z.string().describe('ID of the group'),
  groupName: z.string().describe('Name of the group')
});

let workspaceRelationSchema = z.object({
  workspaceId: z.string().describe('ID of the workspace'),
  workspaceName: z.string().describe('Name of the workspace'),
  status: z.string().describe('Status of the user in the workspace'),
  groups: z
    .array(userGroupSchema)
    .optional()
    .describe('Groups the user belongs to in this workspace')
});

let userSchema = z.object({
  userId: z.string().describe('UUID of the user'),
  name: z.string().describe('Full name of the user'),
  email: z.string().describe('Email address of the user'),
  status: z.string().describe('User status (active or archived)'),
  workspaces: z
    .array(workspaceRelationSchema)
    .optional()
    .describe('Workspaces the user belongs to')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users on the ToolJet instance with their workspace permissions and group memberships. Optionally filter by group names.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      groupNames: z
        .string()
        .optional()
        .describe('Comma-separated group names to filter users by (e.g., "admin,all_users")')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let rawUsers = await client.listUsers(ctx.input.groupNames);

    let users = rawUsers.map((u: any) => ({
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
    }));

    return {
      output: { users },
      message: `Found **${users.length}** user(s)${ctx.input.groupNames ? ` matching groups: ${ctx.input.groupNames}` : ''}.`
    };
  })
  .build();
