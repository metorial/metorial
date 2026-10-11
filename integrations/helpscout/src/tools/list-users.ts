import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { halPageInfo } from '../lib/pagination';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users (agents/staff) in the Help Scout account, optionally filtered by email or mailbox. Can also retrieve a specific user by ID or the authenticated user's profile (me).`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      userId: z
        .number()
        .optional()
        .describe('Get a specific user by ID. Omit to list all users.'),
      me: z.boolean().optional().describe('If true, return the authenticated user profile'),
      email: z.string().optional().describe('Filter the list by exact email address'),
      mailboxId: z
        .number()
        .optional()
        .describe('Filter the list to users with access to this mailbox ID'),
      page: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            firstName: z.string().nullable().describe('First name'),
            lastName: z.string().nullable().describe('Last name'),
            email: z.string().describe('Email address'),
            role: z.string().optional().describe('User role'),
            type: z.string().optional().describe('User type'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            photoUrl: z.string().nullable().optional().describe('Profile photo URL')
          })
        )
        .optional()
        .describe('List of users'),
      user: z
        .object({
          userId: z.number(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          email: z.string(),
          role: z.string().optional(),
          type: z.string().optional(),
          createdAt: z.string().optional(),
          photoUrl: z.string().nullable().optional()
        })
        .optional()
        .describe('Single user details'),
      totalCount: z.number().optional().describe('Total users (list)'),
      currentPage: z.number().optional().describe('Current page (list)'),
      totalPages: z.number().optional().describe('Total pages (list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.me) {
      let data = await client.getAuthenticatedUser();
      let user = {
        userId: data.id,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.email,
        role: data.role,
        type: data.type,
        createdAt: data.createdAt,
        photoUrl: data.photoUrl ?? null
      };
      return {
        output: { user },
        message: `Authenticated user: **${[data.firstName, data.lastName].filter(Boolean).join(' ')}** (${data.email}).`
      };
    }

    if (ctx.input.userId) {
      let data = await client.getUser(ctx.input.userId);
      let user = {
        userId: data.id,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        email: data.email,
        role: data.role,
        type: data.type,
        createdAt: data.createdAt,
        photoUrl: data.photoUrl ?? null
      };
      return {
        output: { user },
        message: `User **${[data.firstName, data.lastName].filter(Boolean).join(' ')}** (${data.email}).`
      };
    }

    let data = await client.listUsers({
      page: ctx.input.page,
      email: ctx.input.email,
      mailbox: ctx.input.mailboxId
    });
    let embedded = data?._embedded?.users ?? [];
    let users = embedded.map((u: any) => ({
      userId: u.id,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      email: u.email,
      role: u.role,
      type: u.type,
      createdAt: u.createdAt,
      photoUrl: u.photoUrl ?? null
    }));

    let page = halPageInfo(data, users.length);

    return {
      output: { users, ...page },
      message: `Found **${page.totalCount}** users (page ${page.currentPage} of ${page.totalPages}).`
    };
  })
  .build();
