import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.number().describe('Unique ID of the user'),
  name: z.string().nullable().describe('Display name'),
  email: z.string().nullable().describe('Email address'),
  avatarUrl: z.string().nullable().describe('URL of the user avatar'),
  isAdmin: z.boolean().optional().describe('Whether the user is an admin'),
  state: z.string().optional().describe('User state'),
  supportedSuggestionsCount: z
    .number()
    .optional()
    .describe('Number of suggestions the user supports'),
  satisfactionScore: z.number().nullable().describe('User satisfaction score'),
  createdAt: z.string().optional().describe('When the user was created'),
  lastLogin: z.string().nullable().describe('Last login timestamp'),
  raw: z.record(z.string(), z.unknown()).optional().describe('Full provider record')
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
      users: z.array(userSchema).optional(),
      totalRecords: z.number().optional().describe('Total number of users'),
      totalPages: z.number().optional().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    });

    let result = await client.listUsers({
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      updatedAfter: ctx.input.updatedAfter
    });

    let users = result.users?.map((u: any) => ({
      userId: u.id,
      name: u.name ?? null,
      email: u.email_address ?? null,
      avatarUrl: u.avatar_url ?? null,
      isAdmin: u.is_admin,
      state: u.state ?? undefined,
      supportedSuggestionsCount: u.supported_suggestions_count,
      satisfactionScore: u.satisfaction_score ?? null,
      createdAt: u.created_at ?? undefined,
      lastLogin: u.last_login ?? null,
      raw: u
    }));

    return {
      output: {
        users,
        totalRecords: result.pagination?.totalRecords,
        totalPages: result.pagination?.totalPages
      },
      message: 'Retrieved UserVoice records.'
    };
  })
  .build();
