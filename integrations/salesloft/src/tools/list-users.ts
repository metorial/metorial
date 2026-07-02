import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userOutputSchema = z.object({
  userId: z.number().describe('SalesLoft user ID'),
  guid: z.string().nullable().optional().describe('Globally unique user ID'),
  name: z.string().nullable().optional().describe('Full name'),
  firstName: z.string().nullable().optional().describe('First name'),
  lastName: z.string().nullable().optional().describe('Last name'),
  email: z.string().nullable().optional().describe('Email address'),
  active: z.boolean().nullable().optional().describe('Whether user is active'),
  role: z.string().nullable().optional().describe('User role (Admin, User, or custom)')
});

let mapUser = (raw: any) => ({
  userId: raw.id,
  guid: raw.guid,
  name: raw.name,
  firstName: raw.first_name,
  lastName: raw.last_name,
  email: raw.email,
  active: raw.active,
  role: raw.role
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List team members/users in SalesLoft. Non-admin users see only their own profile; admins see all team members.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)')
    })
  )
  .output(
    z.object({
      users: z.array(userOutputSchema).describe('List of users'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listUsers(ctx.input);
    let users = result.data.map(mapUser);

    return {
      output: {
        users,
        paging: result.metadata.paging
      },
      message: `Found **${users.length}** users (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();

export let getMe = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description: `Fetch the currently authenticated user's profile from SalesLoft. Returns the user's name, email, role, and active status.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(userOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let user = await client.getMe();
    let output = mapUser(user);

    return {
      output,
      message: `Current user: **${output.name}** (${output.email}).`
    };
  })
  .build();
