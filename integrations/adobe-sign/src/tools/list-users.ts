import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in the Adobe Sign account. Returns user details including email, name, and group membership.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of users per page')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('ID of the user'),
            email: z.string().optional().describe('Email address'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            company: z.string().optional().describe('Company name'),
            isAccountAdmin: z
              .boolean()
              .optional()
              .describe('Whether the user is an account admin'),
            status: z.string().optional().describe('User status (ACTIVE, INACTIVE, etc.)')
          })
        )
        .describe('List of users'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.listUsers({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let users = (result.userInfoList || []).map((u: any) => ({
      userId: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      company: u.company,
      isAccountAdmin: u.isAccountAdmin,
      status: u.status
    }));

    return {
      output: {
        users,
        cursor: result.page?.nextCursor
      },
      message: `Found **${users.length}** user(s).`
    };
  });
