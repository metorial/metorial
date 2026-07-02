import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('User ID'),
  name: z.string().describe('User name'),
  email: z.string().describe('User email'),
  url: z.string().nullable().describe('User profile URL'),
  title: z.string().nullable().describe('User job title'),
  phone: z.string().nullable().describe('User phone number'),
  location: z.string().nullable().describe('User location'),
  enabled: z.boolean().describe('Whether the user is enabled'),
  isAdmin: z.boolean().describe('Whether the user is an admin'),
  isGuest: z.boolean().describe('Whether the user is a guest'),
  createdAt: z.string().nullable().describe('Account creation timestamp'),
  photoUrl: z.string().nullable().describe('Profile photo URL'),
  teams: z
    .array(
      z.object({
        teamId: z.string().describe('Team ID'),
        name: z.string().describe('Team name')
      })
    )
    .describe('Teams the user belongs to')
});

export let listUsersTool = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieve users from the Monday.com account. Filter by user IDs, email addresses, or name. Returns user profile details and team memberships.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userIds: z.array(z.string()).optional().describe('Specific user IDs to retrieve'),
      emails: z.array(z.string()).optional().describe('Filter users by email addresses'),
      name: z.string().optional().describe('Fuzzy search by name'),
      limit: z.number().optional().describe('Maximum number of users to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });

    let users = await client.getUsers({
      ids: ctx.input.userIds,
      emails: ctx.input.emails,
      name: ctx.input.name,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let mapped = users.map((u: any) => ({
      userId: String(u.id),
      name: u.name,
      email: u.email,
      url: u.url || null,
      title: u.title || null,
      phone: u.phone || null,
      location: u.location || null,
      enabled: u.enabled ?? true,
      isAdmin: u.is_admin ?? false,
      isGuest: u.is_guest ?? false,
      createdAt: u.created_at || null,
      photoUrl: u.photo_original || null,
      teams: (u.teams || []).map((t: any) => ({
        teamId: String(t.id),
        name: t.name
      }))
    }));

    return {
      output: { users: mapped },
      message: `Found **${mapped.length}** user(s).`
    };
  })
  .build();
