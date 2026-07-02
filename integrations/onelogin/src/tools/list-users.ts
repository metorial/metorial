import { SlateTool } from 'slates';
import { z } from 'zod';
import { OneLoginClient } from '../lib/client';
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
      'User status (0=Unactivated, 1=Active, 2=Suspended, 3=Locked, 5=AwaitingPasswordReset, 7=PendingActivation, 8=SecurityQuestionRequired)'
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
      users: z.array(userSchema).describe('List of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OneLoginClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    let params: Record<string, string | number | undefined> = {};
    if (ctx.input.firstname) params.firstname = ctx.input.firstname;
    if (ctx.input.lastname) params.lastname = ctx.input.lastname;
    if (ctx.input.email) params.email = ctx.input.email;
    if (ctx.input.username) params.username = ctx.input.username;
    if (ctx.input.directoryId) params.directory_id = ctx.input.directoryId;
    if (ctx.input.externalId) params.external_id = ctx.input.externalId;
    if (ctx.input.appId) params.app_id = ctx.input.appId;
    if (ctx.input.createdSince) params.created_since = ctx.input.createdSince;
    if (ctx.input.createdUntil) params.created_until = ctx.input.createdUntil;
    if (ctx.input.updatedSince) params.updated_since = ctx.input.updatedSince;
    if (ctx.input.updatedUntil) params.updated_until = ctx.input.updatedUntil;
    if (ctx.input.limit) params.limit = ctx.input.limit;

    let data = await client.listUsers(params);
    let users = Array.isArray(data) ? data : data.data || [];

    let mapped = users.map((u: any) => ({
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
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  });
