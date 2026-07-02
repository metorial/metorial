import { SlateTool } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  email: z.string().describe('Email address of the user'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  verified: z.boolean().optional().describe('Whether the user email is verified'),
  active: z.boolean().optional().describe('Whether the user is active'),
  invited: z.boolean().optional().describe('Whether the user was invited'),
  role: z.string().optional().describe('Account-level role'),
  phone: z.string().optional().nullable().describe('Phone number'),
  picture: z.string().optional().nullable().describe('Profile picture URL'),
  createdAt: z.string().optional().describe('Timestamp when the user was created'),
  loggedInAt: z.string().optional().nullable().describe('Last login timestamp')
});

let mapUser = (u: any) => ({
  userId: u.id,
  email: u.email,
  givenName: u.given_name,
  familyName: u.family_name,
  verified: u.verified,
  active: u.active,
  invited: u.invited,
  role: u.role,
  phone: u.phone,
  picture: u.picture,
  createdAt: u.created_at,
  loggedInAt: u.logged_in_at
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the Fivetran account with their roles, status, and contact information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      users: z.array(userOutputSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let items = await client.listUsers();

    let users = items.map(mapUser);

    return {
      output: { users },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getUser = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve details of a specific user or the currently authenticated user.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('ID of the user to retrieve. If omitted, returns the current user.')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    let u = ctx.input.userId
      ? await client.getUser(ctx.input.userId)
      : await client.getCurrentUser();

    return {
      output: mapUser(u),
      message: `Retrieved user **${u.email}** (${u.id}).`
    };
  })
  .build();

export let inviteUser = SlateTool.create(spec, {
  name: 'Invite User',
  key: 'invite_user',
  description: `Invite a new user to the Fivetran account by email. Assign an account-level role during invitation.`
})
  .input(
    z.object({
      email: z.string().describe('Email address of the user to invite'),
      givenName: z.string().optional().describe('First name of the user'),
      familyName: z.string().optional().describe('Last name of the user'),
      phone: z.string().optional().describe('Phone number'),
      role: z
        .string()
        .optional()
        .describe(
          'Account-level role to assign (e.g., "Account Administrator", "Account Analyst")'
        )
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {
      email: ctx.input.email
    };
    if (ctx.input.givenName) body.given_name = ctx.input.givenName;
    if (ctx.input.familyName) body.family_name = ctx.input.familyName;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.role) body.role = ctx.input.role;

    let u = await client.inviteUser(body);

    return {
      output: mapUser(u),
      message: `Invited user **${u.email}** with role ${u.role || 'default'}.`
    };
  })
  .build();

export let updateUser = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update a user's information such as name, phone, or role.`
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to update'),
      givenName: z.string().optional().describe('Updated first name'),
      familyName: z.string().optional().describe('Updated last name'),
      phone: z.string().optional().describe('Updated phone number'),
      role: z.string().optional().describe('Updated account-level role')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.givenName) body.given_name = ctx.input.givenName;
    if (ctx.input.familyName) body.family_name = ctx.input.familyName;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.role) body.role = ctx.input.role;

    let u = await client.updateUser(ctx.input.userId, body);

    return {
      output: mapUser(u),
      message: `Updated user **${u.email}** (${u.id}).`
    };
  })
  .build();

export let deleteUser = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Remove a user from the Fivetran account. This revokes all their access.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FivetranClient(ctx.auth.token);
    await client.deleteUser(ctx.input.userId);

    return {
      output: { success: true },
      message: `Deleted user ${ctx.input.userId}.`
    };
  })
  .build();
