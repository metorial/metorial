import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  optionalString,
  requiredBoolean,
  requiredString,
  requireRecords
} from '../lib/response';
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
      raw: z
        .unknown()
        .optional()
        .describe(
          'Complete provider response, including values without a compatible summary field'
        ),
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

    let mapped = requireRecords(users, true).map(user => ({
      userId: requiredString(user.id, 'user id'),
      name: requiredString(user.name, 'user name'),
      email: requiredString(user.email, 'user email'),
      phone: optionalString(user.phone),
      profilePhoto: optionalString(user.profile_photo),
      isOwner: requiredBoolean(user.isOwner, 'isOwner'),
      isAdmin: requiredBoolean(user.isAdmin, 'isAdmin')
    }));

    return {
      output: { users: mapped, raw: users },
      message: `Found **${mapped.length}** user(s) in the workspace.`
    };
  })
  .build();
