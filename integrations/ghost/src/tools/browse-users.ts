import { SlateTool } from 'slates';
import { z } from 'zod';
import { GhostAdminClient } from '../lib/client';
import { spec } from '../spec';

let userSchema = z.object({
  userId: z.string().describe('Unique user ID'),
  name: z.string().describe('User display name'),
  slug: z.string().describe('URL-friendly slug'),
  email: z.string().describe('User email address'),
  profileImage: z.string().nullable().describe('Profile image URL'),
  coverImage: z.string().nullable().describe('Cover image URL'),
  bio: z.string().nullable().describe('User biography'),
  website: z.string().nullable().describe('User website URL'),
  location: z.string().nullable().describe('User location'),
  accessibility: z.string().nullable().describe('Accessibility settings'),
  status: z.string().describe('User status (active, inactive, locked)'),
  lastSeen: z.string().nullable().describe('Last seen timestamp'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  url: z.string().describe('User profile URL'),
  roles: z
    .array(
      z.object({
        roleId: z.string(),
        name: z.string(),
        description: z.string()
      })
    )
    .optional()
    .describe('User roles')
});

let paginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  pages: z.number(),
  total: z.number(),
  next: z.number().nullable(),
  prev: z.number().nullable()
});

export let browseUsers = SlateTool.create(spec, {
  name: 'Browse Users',
  key: 'browse_users',
  description: `List staff users of your Ghost site. Users are staff members with role-based permissions (Contributor, Author, Editor, Administrator, Owner). This is a read-only view of staff data.`,
  instructions: [
    "Use **include** with `roles` to see each user's role.",
    'Use **include** with `count.posts` to see how many posts each user has.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      include: z
        .string()
        .optional()
        .describe('Comma-separated includes (e.g., "roles", "count.posts")'),
      filter: z.string().optional().describe('Ghost NQL filter expression'),
      limit: z.number().optional().describe('Number of users per page'),
      page: z.number().optional().describe('Page number'),
      order: z.string().optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      users: z.array(userSchema).describe('List of staff users'),
      pagination: paginationSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new GhostAdminClient({
      domain: ctx.config.adminDomain,
      apiKey: ctx.auth.token
    });

    let result = await client.browseUsers({
      include: ctx.input.include ?? 'roles',
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      page: ctx.input.page,
      order: ctx.input.order
    });

    let users = (result.users ?? []).map((u: any) => ({
      userId: u.id,
      name: u.name,
      slug: u.slug,
      email: u.email,
      profileImage: u.profile_image ?? null,
      coverImage: u.cover_image ?? null,
      bio: u.bio ?? null,
      website: u.website ?? null,
      location: u.location ?? null,
      accessibility: u.accessibility ?? null,
      status: u.status,
      lastSeen: u.last_seen ?? null,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      url: u.url,
      roles: u.roles?.map((r: any) => ({
        roleId: r.id,
        name: r.name,
        description: r.description
      }))
    }));

    let pagination = result.meta?.pagination ?? {
      page: 1,
      limit: 15,
      pages: 1,
      total: users.length,
      next: null,
      prev: null
    };

    return {
      output: { users, pagination },
      message: `Found **${pagination.total}** staff users.`
    };
  })
  .build();
