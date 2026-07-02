import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  firstName: z.string().nullable().describe('First name of the user'),
  lastName: z.string().nullable().describe('Last name of the user'),
  email: z.string().nullable().describe('Email address of the user'),
  status: z.string().describe('Current status: INVITED, ACTIVE, ARCHIVED, or NOT_INVITED'),
  managerId: z.string().nullable().optional().describe("ID of the user's manager"),
  departmentId: z.string().nullable().optional().describe("ID of the user's department"),
  locationId: z.string().nullable().optional().describe("ID of the user's location")
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Brex account. Supports filtering by email and pagination. Returns user profiles including name, email, status, department, and location assignments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter users by email address'),
      cursor: z
        .string()
        .optional()
        .describe('Pagination cursor for fetching next page of results'),
      limit: z.number().optional().describe('Maximum number of results per page (max 1000)')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users'),
      nextCursor: z
        .string()
        .nullable()
        .describe('Cursor for the next page of results, null if no more pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      email: ctx.input.email,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let users = result.items.map((u: any) => ({
      userId: u.id,
      firstName: u.first_name ?? null,
      lastName: u.last_name ?? null,
      email: u.email ?? null,
      status: u.status,
      managerId: u.manager_id,
      departmentId: u.department_id,
      locationId: u.location_id
    }));

    return {
      output: {
        users,
        nextCursor: result.next_cursor
      },
      message: `Found **${users.length}** user(s).${result.next_cursor ? ' More results available.' : ''}`
    };
  })
  .build();
