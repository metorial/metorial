import { SlateTool } from 'slates';
import { z } from 'zod';
import { getClient } from '../lib/client';
import { pagination } from '../lib/schemas';
import { spec } from '../spec';

let userSchema = z
  .object({
    userId: z.string().describe('Unique user ID'),
    name: z.string().optional().describe('User display name'),
    slug: z.string().optional().describe('URL-friendly slug'),
    email: z.string().optional().describe('User email address'),
    profileImage: z.string().nullable().optional().describe('Profile image URL'),
    coverImage: z.string().nullable().optional().describe('Cover image URL'),
    bio: z.string().nullable().optional().describe('User biography'),
    website: z.string().nullable().optional().describe('User website URL'),
    location: z.string().nullable().optional().describe('User location'),
    accessibility: z.string().nullable().optional().describe('Accessibility settings'),
    status: z.string().optional().describe('User status (active, inactive, locked)'),
    lastSeen: z.string().nullable().optional().describe('Last seen timestamp'),
    createdAt: z.string().optional().describe('Creation timestamp'),
    updatedAt: z.string().optional().describe('Last update timestamp'),
    url: z.string().optional().describe('User profile URL'),
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
  })
  .partial()
  .required({ userId: true });

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
    let client = getClient(ctx);

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
      profileImage: u.profile_image,
      coverImage: u.cover_image,
      bio: u.bio,
      website: u.website,
      location: u.location,
      accessibility: u.accessibility,
      status: u.status,
      lastSeen: u.last_seen,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
      url: u.url,
      roles: u.roles?.map((r: any) => ({
        roleId: r.id,
        name: r.name,
        description: r.description
      }))
    }));

    let pageInfo = pagination(result, users.length);

    return {
      output: { users, pagination: pageInfo },
      message: `Found **${pageInfo.total}** staff users.`
    };
  })
  .build();
