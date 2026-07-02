import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.number().describe('User ID'),
  userName: z.string().describe('Username'),
  email: z.string().optional().describe('Email address'),
  givenName: z.string().optional().describe('First name'),
  familyName: z.string().optional().describe('Last name'),
  active: z.boolean().optional().describe('Whether the user is active'),
  authType: z.string().optional().describe('Authentication type'),
  userType: z.string().optional().describe('User role type'),
  locked: z.boolean().optional().describe('Whether the user is locked'),
  createdDate: z.string().optional().describe('Account creation date'),
  lastActiveDate: z.string().optional().describe('Last activity date')
});

let mapUser = (u: Record<string, unknown>) => ({
  userId: Number(u.id),
  userName: String(u.userName || ''),
  email: u.email ? String(u.email) : undefined,
  givenName: (u.name as Record<string, unknown>)?.givenName
    ? String((u.name as Record<string, unknown>).givenName)
    : undefined,
  familyName: (u.name as Record<string, unknown>)?.familyName
    ? String((u.name as Record<string, unknown>).familyName)
    : undefined,
  active: typeof u.active === 'boolean' ? u.active : undefined,
  authType: u.authType ? String(u.authType) : undefined,
  userType: u.userType ? String(u.userType) : undefined,
  locked: typeof u.locked === 'boolean' ? u.locked : undefined,
  createdDate: u.createdDate ? String(u.createdDate) : undefined,
  lastActiveDate: u.lastActiveDate ? String(u.lastActiveDate) : undefined
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Egnyte domain. Supports filtering by username, email, or other attributes using SCIM filter syntax. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z
        .string()
        .optional()
        .describe(
          'SCIM filter expression (e.g. \'userName Eq "jsmith"\' or \'email co "@example.com"\')'
        ),
      startIndex: z.number().optional().describe('1-based index of the first result'),
      count: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema).describe('List of users'),
      totalResults: z.number().optional().describe('Total number of matching users'),
      startIndex: z.number().optional(),
      itemsPerPage: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listUsers({
      filter: ctx.input.filter,
      startIndex: ctx.input.startIndex,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let resources = Array.isArray(result.resources)
      ? result.resources
      : Array.isArray(result.Resources)
        ? result.Resources
        : [];
    let users = resources.map((u: Record<string, unknown>) => mapUser(u));

    return {
      output: {
        users,
        totalResults:
          typeof result.totalResults === 'number' ? result.totalResults : undefined,
        startIndex: typeof result.startIndex === 'number' ? result.startIndex : undefined,
        itemsPerPage: typeof result.itemsPerPage === 'number' ? result.itemsPerPage : undefined
      },
      message: `Found **${users.length}** user(s)${ctx.input.filter ? ` matching filter "${ctx.input.filter}"` : ''}`
    };
  })
  .build();

export let getUserTool = SlateTool.create(spec, {
  name: 'Get User',
  key: 'get_user',
  description: `Retrieve detailed information about a specific user in Egnyte by their user ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('Numeric user ID')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.getUser(ctx.input.userId)) as Record<string, unknown>;

    return {
      output: mapUser(result),
      message: `Retrieved user **${result.userName}** (ID: ${ctx.input.userId})`
    };
  })
  .build();

export let createUserTool = SlateTool.create(spec, {
  name: 'Create User',
  key: 'create_user',
  description: `Create a new user in your Egnyte domain. Configure their role, authentication type, and whether they receive an invitation email.`
})
  .input(
    z.object({
      userName: z.string().describe('Username for the new user'),
      email: z.string().describe('Email address'),
      givenName: z.string().describe('First name'),
      familyName: z.string().describe('Last name'),
      userType: z.enum(['admin', 'power', 'standard']).optional().describe('User role type'),
      authType: z.enum(['egnyte', 'sso', 'ad']).optional().describe('Authentication type'),
      sendInvite: z.boolean().optional().describe('Whether to send an invitation email'),
      active: z.boolean().optional().describe('Whether the user should be active immediately')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.createUser({
      userName: ctx.input.userName,
      email: ctx.input.email,
      givenName: ctx.input.givenName,
      familyName: ctx.input.familyName,
      userType: ctx.input.userType,
      authType: ctx.input.authType,
      sendInvite: ctx.input.sendInvite,
      active: ctx.input.active
    })) as Record<string, unknown>;

    return {
      output: mapUser(result),
      message: `Created user **${ctx.input.userName}** (${ctx.input.email})`
    };
  })
  .build();

export let updateUserTool = SlateTool.create(spec, {
  name: 'Update User',
  key: 'update_user',
  description: `Update an existing user's properties in Egnyte. Only the specified fields will be changed.`
})
  .input(
    z.object({
      userId: z.number().describe('Numeric user ID to update'),
      email: z.string().optional().describe('New email address'),
      givenName: z.string().optional().describe('New first name'),
      familyName: z.string().optional().describe('New last name'),
      active: z.boolean().optional().describe('Set user active/inactive'),
      userType: z
        .enum(['admin', 'power', 'standard'])
        .optional()
        .describe('New user role type'),
      authType: z.enum(['egnyte', 'sso', 'ad']).optional().describe('New authentication type')
    })
  )
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let body: Record<string, unknown> = {};
    if (ctx.input.email !== undefined) body.email = ctx.input.email;
    if (ctx.input.givenName !== undefined || ctx.input.familyName !== undefined) {
      body.name = {
        ...(ctx.input.givenName !== undefined ? { givenName: ctx.input.givenName } : {}),
        ...(ctx.input.familyName !== undefined ? { familyName: ctx.input.familyName } : {})
      };
    }
    if (ctx.input.active !== undefined) body.active = ctx.input.active;
    if (ctx.input.userType !== undefined) body.userType = ctx.input.userType;
    if (ctx.input.authType !== undefined) body.authType = ctx.input.authType;

    let result = (await client.updateUser(ctx.input.userId, body)) as Record<string, unknown>;

    return {
      output: mapUser(result),
      message: `Updated user **${result.userName}** (ID: ${ctx.input.userId})`
    };
  })
  .build();

export let deleteUserTool = SlateTool.create(spec, {
  name: 'Delete User',
  key: 'delete_user',
  description: `Delete a user from your Egnyte domain. This permanently removes the user account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.number().describe('Numeric user ID to delete')
    })
  )
  .output(
    z.object({
      userId: z.number(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteUser(ctx.input.userId);

    return {
      output: {
        userId: ctx.input.userId,
        deleted: true
      },
      message: `Deleted user with ID **${ctx.input.userId}**`
    };
  })
  .build();
