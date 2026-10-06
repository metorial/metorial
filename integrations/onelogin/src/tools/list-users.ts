import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
import { publicPagination } from '../lib/contracts';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique user ID'),
  username: z.string().nullable().optional().describe('Username'),
  email: z.string().nullable().optional().describe('Email address'),
  firstname: z.string().nullable().optional().describe('First name'),
  lastname: z.string().nullable().optional().describe('Last name'),
  company: z.string().nullable().optional().describe('Company name'),
  department: z.string().nullable().optional().describe('Department'),
  title: z.string().nullable().optional().describe('Job title'),
  phone: z.string().nullable().optional().describe('Phone number'),
  status: z
    .number()
    .nullable()
    .optional()
    .describe(
      'User status (0=Unactivated, 1=Active, 2=Suspended, 3=Locked, 4=PasswordExpired, 5=AwaitingPasswordReset, 7=PasswordPending, 8=SecurityQuestionRequired)'
    ),
  state: z
    .number()
    .nullable()
    .optional()
    .describe('User state (0=Unapproved, 1=Approved, 2=Rejected, 3=Unlicensed)'),
  groupId: z.number().nullable().optional().describe('Group ID the user belongs to'),
  roleIds: z
    .array(z.number())
    .nullable()
    .optional()
    .describe('Array of role IDs assigned to the user'),
  createdAt: z.string().nullable().optional().describe('ISO8601 creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('ISO8601 last update timestamp'),
  lastLogin: z.string().nullable().optional().describe('ISO8601 last login timestamp')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Search and list users in the OneLogin directory. Supports filtering by name, email, username, directory, external ID, app, and date ranges. Use wildcards (*) in filter values for partial matching.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      afterCursor: z
        .string()
        .optional()
        .describe('Opaque next cursor; repeat the same filters. Do not combine with page.'),
      page: z
        .number()
        .optional()
        .describe('Positive page number; do not combine with afterCursor.'),
      firstname: z.string().optional().describe('Filter by first name (supports wildcards *)'),
      lastname: z.string().optional().describe('Filter by last name (supports wildcards *)'),
      email: z.string().optional().describe('Filter by email address (supports wildcards *)'),
      username: z.string().optional().describe('Filter by username (supports wildcards *)'),
      directoryId: z.number().optional().describe('Filter by directory ID'),
      externalId: z.string().optional().describe('Filter by external ID'),
      appId: z
        .number()
        .optional()
        .describe('Filter by app ID to find users with access to a specific app'),
      createdSince: z
        .string()
        .optional()
        .describe('ISO8601 date to filter users created after this time'),
      createdUntil: z
        .string()
        .optional()
        .describe('ISO8601 date to filter users created before this time'),
      updatedSince: z
        .string()
        .optional()
        .describe('ISO8601 date to filter users updated after this time'),
      updatedUntil: z
        .string()
        .optional()
        .describe('ISO8601 date to filter users updated before this time'),
      limit: z.number().optional().describe('Maximum number of results per page (max 50)')
    })
  )
  .output(
    z.object({
      afterCursor: z
        .string()
        .nullable()
        .describe('Native next cursor, or null when none is supplied'),
      pagination: publicPagination,
      users: z.array(userSchema).describe('List of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = OneLoginClient.fromContext(ctx);

    let params: Record<string, string | number | undefined> = {
      cursor: ctx.input.afterCursor,
      page: ctx.input.page,
      limit: ctx.input.limit
    };
    if (ctx.input.firstname !== undefined) params.firstname = ctx.input.firstname;
    if (ctx.input.lastname !== undefined) params.lastname = ctx.input.lastname;
    if (ctx.input.email !== undefined) params.email = ctx.input.email;
    if (ctx.input.username !== undefined) params.username = ctx.input.username;
    if (ctx.input.directoryId !== undefined) params.directory_id = ctx.input.directoryId;
    if (ctx.input.externalId !== undefined) params.external_id = ctx.input.externalId;
    if (ctx.input.appId !== undefined) params.app_id = ctx.input.appId;
    if (ctx.input.createdSince !== undefined) params.created_since = ctx.input.createdSince;
    if (ctx.input.createdUntil !== undefined) params.created_until = ctx.input.createdUntil;
    if (ctx.input.updatedSince !== undefined) params.updated_since = ctx.input.updatedSince;
    if (ctx.input.updatedUntil !== undefined) params.updated_until = ctx.input.updatedUntil;
    if (ctx.input.limit !== undefined) params.limit = ctx.input.limit;

    let data = await client.listUsers(params);
    let users = data.data;

    let mapped = users.map(u => ({
      userId: u.id,
      username: u.username,
      email: u.email,
      firstname: u.firstname,
      lastname: u.lastname,
      company: u.company,
      department: u.department,
      title: u.title,
      phone: u.phone,
      status: u.status,
      state: u.state,
      groupId: u.group_id,
      roleIds: u.role_ids,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      lastLogin: u.last_login
    }));

    return {
      output: {
        users: mapped,
        afterCursor: data.pagination.afterCursor,
        pagination: data.pagination
      },
      message: `Found **${mapped.length}** on this page; user(s).`
    };
  });
