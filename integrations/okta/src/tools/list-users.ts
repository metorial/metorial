import { SlateTool } from 'slates';
import { z } from 'zod';
import { OktaClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique Okta user ID'),
  status: z
    .string()
    .describe(
      'User status (STAGED, PROVISIONED, ACTIVE, RECOVERY, LOCKED_OUT, PASSWORD_EXPIRED, SUSPENDED, DEPROVISIONED)'
    ),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().optional().describe('Primary email'),
  login: z.string().optional().describe('Okta login'),
  created: z.string().describe('When the user was created'),
  lastLogin: z.string().optional().describe('Last login timestamp'),
  lastUpdated: z.string().describe('When the user was last updated')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Search and list users in your Okta organization. Supports keyword search, Okta filter expressions, and SCIM search queries for flexible lookups by name, email, status, or any profile attribute.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Keyword search across first name, last name, and email'),
      filter: z
        .string()
        .optional()
        .describe('Okta filter expression, e.g. status eq "ACTIVE"'),
      search: z
        .string()
        .optional()
        .describe(
          'SCIM search expression for advanced queries, e.g. profile.department eq "Engineering"'
        ),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of users to return (default 200, max 200)'),
      after: z.string().optional().describe('Pagination cursor for the next page of results')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of matching users'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OktaClient({
      domain: ctx.config.domain,
      token: ctx.auth.token
    });

    let result = await client.listUsers({
      query: ctx.input.query,
      filter: ctx.input.filter,
      search: ctx.input.search,
      limit: ctx.input.limit,
      after: ctx.input.after
    });

    let users = result.items.map(u => ({
      userId: u.id,
      status: u.status,
      firstName: u.profile.firstName,
      lastName: u.profile.lastName,
      email: u.profile.email,
      login: u.profile.login,
      created: u.created,
      lastLogin: u.lastLogin || undefined,
      lastUpdated: u.lastUpdated
    }));

    // Extract after cursor from next URL
    let nextCursor: string | undefined;
    if (result.nextUrl) {
      let url = new URL(result.nextUrl);
      nextCursor = url.searchParams.get('after') || undefined;
    }

    return {
      output: {
        users,
        nextCursor,
        hasMore: !!result.nextUrl
      },
      message: `Found **${users.length}** user(s)${result.nextUrl ? ' (more available)' : ''}.`
    };
  })
  .build();
