import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapUser } from '../lib/schemas';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique identifier of the user'),
  firstName: z.string().nullable().describe('First name of the user'),
  lastName: z.string().nullable().describe('Last name of the user'),
  email: z.string().nullable().describe('Email address of the user'),
  status: z
    .string()
    .nullish()
    .describe(
      'Current user status, including ACTIVE, DISABLED, INACTIVE, ARCHIVED or INVITED'
    ),
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
    const result = await new Client({ token: ctx.auth.token }).listUsers({
      email: ctx.input.email,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });
    const users = result.items.map(mapUser);
    return {
      output: { users, nextCursor: result.next_cursor },
      message: `Returned ${users.length} users.`
    };
  })
  .build();
