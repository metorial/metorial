import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { nativeId, optionalText, text } from '../lib/contracts';
import { spec } from '../spec';

let userSummarySchema = z.object({
  userId: z.number().describe('User ID'),
  username: z.string().describe('Username'),
  email: z.string().optional().describe('Email address'),
  name: z.string().optional().describe('Full name'),
  siteAdmin: z.boolean().optional().describe('Whether user is a site admin'),
  disabled: z.boolean().optional().describe('Whether account is disabled'),
  authenticationMethod: z.string().optional().describe('Authentication method'),
  lastLoginAt: z.string().optional().describe('Last login timestamp'),
  createdAt: z.string().optional().describe('Account creation timestamp')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List user accounts with optional search filtering. Returns user details including username, email, admin status, and login history. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by name, username, or email'),
      cursor: z.string().optional().describe('Pagination cursor'),
      perPage: z.number().optional().describe('Results per page (default 100)')
    })
  )
  .output(
    z.object({
      users: z.array(userSummarySchema).describe('List of users'),
      nextCursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let result = await client.listUsers({
      cursor: ctx.input.cursor,
      perPage: ctx.input.perPage,
      search: ctx.input.search
    });

    let users = result.users.map((u: Record<string, unknown>) => ({
      userId: nativeId(u.id),
      username: text(u.username),
      email: optionalText(u.email),
      name: optionalText(u.name),
      siteAdmin: typeof u.site_admin === 'boolean' ? u.site_admin : undefined,
      disabled: typeof u.disabled === 'boolean' ? u.disabled : undefined,
      authenticationMethod: optionalText(u.authentication_method),
      lastLoginAt: optionalText(u.last_login_at),
      createdAt: optionalText(u.created_at)
    }));

    return {
      output: { users, nextCursor: result.cursor },
      message: `Found **${users.length}** users${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}${result.cursor ? '. More results available.' : '.'}`
    };
  })
  .build();
