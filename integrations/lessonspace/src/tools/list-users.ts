import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Retrieves a paginated list of users in the organisation. Supports filtering by role, space, session, and search terms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      role: z
        .enum(['teacher', 'student', 'admin'])
        .optional()
        .describe('Filter users by role.'),
      spaceUuid: z
        .string()
        .optional()
        .describe('Filter users who attended sessions in this space.'),
      sessionUuid: z.string().optional().describe('Filter users who attended this session.'),
      search: z.string().optional().describe('Search term to filter users.'),
      page: z.number().optional().describe('Page number for pagination.')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of users matching the filters.'),
      users: z
        .array(
          z.object({
            userId: z.number().describe('Lessonspace user ID.'),
            username: z.string().describe('Username of the user.'),
            role: z.string().describe('User role: teacher, student, or admin.'),
            active: z.boolean().describe('Whether the user is currently active.'),
            name: z.string().nullable().describe('Display name of the user.'),
            externalId: z.string().describe('External identifier for the user.')
          })
        )
        .describe('List of users.'),
      hasMore: z.boolean().describe('Whether more pages of results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organisationId: ctx.config.organisationId
    });

    let result = await client.listUsers({
      role: ctx.input.role,
      space: ctx.input.spaceUuid,
      session: ctx.input.sessionUuid,
      search: ctx.input.search,
      page: ctx.input.page
    });

    let users = result.results.map(u => ({
      userId: u.user.id,
      username: u.user.username,
      role: u.role,
      active: u.active,
      name: u.name,
      externalId: u.externalId
    }));

    return {
      output: {
        totalCount: result.count,
        users,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** users. Showing ${users.length} on this page.`
    };
  })
  .build();
