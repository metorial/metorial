import { SlateTool } from 'slates';
import { z } from 'zod';
import { DialpadClient } from '../lib/client';
import { spec } from '../spec';

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your Dialpad company. Supports filtering by email or state and cursor-based pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().optional().describe('Filter users by email address'),
      state: z
        .enum(['active', 'pending', 'suspended', 'deleted'])
        .optional()
        .describe('Filter by user state'),
      cursor: z.string().optional().describe('Pagination cursor from a previous request')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('User ID'),
          firstName: z.string().optional().describe('First name'),
          lastName: z.string().optional().describe('Last name'),
          displayName: z.string().optional().describe('Display name'),
          emails: z.array(z.string()).optional().describe('Email addresses'),
          phoneNumbers: z.array(z.string()).optional().describe('Phone numbers'),
          state: z.string().optional().describe('User state'),
          isAdmin: z.boolean().optional().describe('Whether user is an admin'),
          officeId: z.string().optional().describe('Office ID'),
          license: z.string().optional().describe('License type')
        })
      ),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DialpadClient({
      token: ctx.auth.token,
      environment: ctx.auth.environment
    });

    let result = await client.listUsers({
      cursor: ctx.input.cursor,
      email: ctx.input.email,
      state: ctx.input.state
    });

    let users = (result.items || []).map((u: any) => ({
      userId: String(u.id),
      firstName: u.first_name,
      lastName: u.last_name,
      displayName: u.display_name,
      emails: u.emails,
      phoneNumbers: u.phone_numbers,
      state: u.state,
      isAdmin: u.is_admin,
      officeId: u.office_id ? String(u.office_id) : undefined,
      license: u.license
    }));

    return {
      output: {
        users,
        nextCursor: result.cursor || undefined
      },
      message: `Found **${users.length}** user(s)${result.cursor ? '. More results available with the next cursor.' : '.'}`
    };
  })
  .build();
