import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  membershipId: z.string().describe('Membership ID'),
  userId: z.string().describe('User ID'),
  email: z.string().describe('User email'),
  name: z.string().nullable().describe('User name'),
  imageUrl: z.string().nullable().describe('User profile image URL'),
  role: z.string().describe('Role: ADMIN, USER, or VIEWER'),
  createdAt: z.string().describe('Membership creation timestamp')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Workspace Members',
  key: 'list_users',
  description: `List all members of the current workspace, including their roles and profile information. Useful for finding assignee IDs when creating or updating threads.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      members: z.array(memberSchema).describe('List of workspace members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers();

    let members = (Array.isArray(result) ? result : result.members || []).map((m: any) => ({
      membershipId: m.id,
      userId: m.userId,
      email: m.user?.email ?? '',
      name: m.user?.name ?? null,
      imageUrl: m.user?.imageUrl ?? null,
      role: m.role,
      createdAt: m.createdAt
    }));

    return {
      output: { members },
      message: `Found **${members.length}** workspace members.`
    };
  })
  .build();
