import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('User ID'),
  email: z.string().optional().describe('User email'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  admin: z.boolean().optional().describe('Whether the user is an admin'),
  licensedSheetCreator: z
    .boolean()
    .optional()
    .describe('Whether the user is a licensed sheet creator'),
  status: z.string().optional().describe('User status (ACTIVE, PENDING, DECLINED)')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List all users in the organization account. Can filter by email address. Requires admin-level access or READ_USERS scope.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter by exact email address'),
      includeAll: z.boolean().optional().describe('Return all users without pagination'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users'),
      totalCount: z.number().optional().describe('Total number of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let result = await client.listUsers({
      email: ctx.input.email,
      includeAll: ctx.input.includeAll,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let users = (result.data || []).map((u: any) => ({
      userId: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      admin: u.admin,
      licensedSheetCreator: u.licensedSheetCreator,
      status: u.status
    }));

    return {
      output: { users, totalCount: result.totalCount },
      message: `Found **${users.length}** user(s).`
    };
  })
  .build();

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Get the profile information of the currently authenticated user.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.number().describe('User ID'),
      email: z.string().optional().describe('User email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      admin: z.boolean().optional().describe('Whether the user is an admin'),
      licensedSheetCreator: z
        .boolean()
        .optional()
        .describe('Whether the user is a licensed sheet creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let user = await client.getCurrentUser();

    return {
      output: {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        admin: user.admin,
        licensedSheetCreator: user.licensedSheetCreator
      },
      message: `Current user: **${user.firstName} ${user.lastName}** (${user.email}).`
    };
  })
  .build();

export let addUser = SlateTool.create(spec, {
  name: 'Add User',
  key: 'add_user',
  description: `Add a new user to the organization. Requires ADMIN_USERS scope. The user will receive an invitation email.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the new user'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      admin: z.boolean().optional().describe('Set as admin'),
      licensedSheetCreator: z
        .boolean()
        .optional()
        .describe('Grant licensed sheet creator access')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the created user'),
      email: z.string().optional().describe('User email'),
      status: z.string().optional().describe('User status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });
    let result = await client.addUser({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      admin: ctx.input.admin,
      licensedSheetCreator: ctx.input.licensedSheetCreator
    });

    let user = result.result || result;
    return {
      output: {
        userId: user.id,
        email: user.email,
        status: user.status
      },
      message: `Added user **${ctx.input.email}** (ID: ${user.id}).`
    };
  })
  .build();
