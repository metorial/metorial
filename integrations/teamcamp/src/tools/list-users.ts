import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Workspace Users',
  key: 'list_users',
  description: `Retrieve all users in the workspace. Returns each user's name, email, and role information (admin/owner status). Useful for looking up team members before assigning tasks or understanding workspace membership.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('Unique user identifier'),
          name: z.string().describe('Full name of the user'),
          email: z.string().describe('Email address of the user'),
          phone: z.string().optional().describe('Phone number of the user'),
          profilePhoto: z.string().optional().describe('URL to the user profile photo'),
          isOwner: z.boolean().describe('Whether the user is the workspace owner'),
          isAdmin: z.boolean().describe('Whether the user is a workspace admin')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let users = await client.getUsers();

    let mapped = (Array.isArray(users) ? users : []).map((u: any) => ({
      userId: u.id ?? '',
      name: u.name ?? '',
      email: u.email ?? '',
      phone: u.phone || undefined,
      profilePhoto: u.profile_photo || undefined,
      isOwner: u.isOwner ?? false,
      isAdmin: u.isAdmin ?? false
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s) in the workspace.`
    };
  })
  .build();
