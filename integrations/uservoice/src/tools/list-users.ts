import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique ID of the user'),
  name: z.string().nullable().describe('Display name'),
  email: z.string().nullable().describe('Email address'),
  avatarUrl: z.string().nullable().describe('URL of the user avatar'),
  isAdmin: z.boolean().describe('Whether the user is an admin'),
  state: z.string().describe('User state'),
  supportedSuggestionsCount: z.number().describe('Number of suggestions the user supports'),
  satisfactionScore: z.number().nullable().describe('User satisfaction score'),
  createdAt: z.string().describe('When the user was created'),
  lastLogin: z.string().nullable().describe('Last login timestamp')
});

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in your UserVoice account. Returns both admin and end users with their profile data, satisfaction scores, and activity metrics. Supports filtering and pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 20, max: 100)'),
      sort: z.string().optional().describe('Sort field. Examples: "-created_at", "name"'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Only return users updated after this ISO 8601 date')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema),
      totalRecords: z.number().describe('Total number of users'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let result = await client.listUsers({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      updatedAfter: ctx.input.updatedAfter
    });

    let users = result.users.map((u: any) => ({
      userId: u.id,
      name: u.name || null,
      email: u.email_address || null,
      avatarUrl: u.avatar_url || null,
      isAdmin: u.is_admin ?? false,
      state: u.state || 'active',
      supportedSuggestionsCount: u.supported_suggestions_count || 0,
      satisfactionScore: u.satisfaction_score ?? null,
      createdAt: u.created_at,
      lastLogin: u.last_login || null
    }));

    return {
      output: {
        users,
        totalRecords: result.pagination?.totalRecords || 0,
        totalPages: result.pagination?.totalPages || 0
      },
      message: `Found **${users.length}** users (page ${result.pagination?.page || 1} of ${result.pagination?.totalPages || 1}).`
    };
  })
  .build();
