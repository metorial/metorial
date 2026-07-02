import { SlateTool } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let getUsers = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve users in the Bigin organization. Filter by user type such as active, deactive, confirmed, admin, or current user. Useful for finding user IDs to assign as record owners.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userType: z
        .enum([
          'AllUsers',
          'ActiveUsers',
          'DeactiveUsers',
          'ConfirmedUsers',
          'NotConfirmedUsers',
          'DeletedUsers',
          'ActiveConfirmedUsers',
          'AdminUsers',
          'ActiveConfirmedAdmins',
          'CurrentUser'
        ])
        .optional()
        .describe('Type of users to retrieve (default AllUsers)'),
      page: z.number().optional().describe('Page number (default 1)'),
      perPage: z.number().optional().describe('Users per page (default 200, max 200)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().optional().describe('User ID'),
            fullName: z.string().optional().describe('Full name of the user'),
            email: z.string().optional().describe('Email address'),
            status: z.string().optional().describe('User status'),
            role: z.record(z.string(), z.any()).optional().describe('Role information'),
            profile: z.record(z.string(), z.any()).optional().describe('Profile information')
          })
        )
        .describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BiginClient({
      token: ctx.auth.token,
      apiDomain: ctx.auth.apiDomain
    });

    let result = await client.getUsers(ctx.input.userType, ctx.input.page, ctx.input.perPage);
    let users = (result.users || []).map((u: any) => ({
      userId: u.id,
      fullName: u.full_name,
      email: u.email,
      status: u.status,
      role: u.role,
      profile: u.profile
    }));

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
