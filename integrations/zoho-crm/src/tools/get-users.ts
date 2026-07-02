import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getUsers = SlateTool.create(spec, {
  name: 'Get Users',
  key: 'get_users',
  description: `Retrieve CRM users from your Zoho organization.
Filter by user type (AllUsers, ActiveUsers, DeactiveUsers, ConfirmedUsers, etc.) or get a specific user by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z
        .string()
        .optional()
        .describe('Specific user ID to retrieve. If provided, returns only that user.'),
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
        .describe('Type of users to retrieve'),
      page: z.number().optional().describe('Page number for pagination'),
      perPage: z.number().optional().describe('Number of users per page (max 200)')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.any())).describe('Array of user objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl
    });

    let result: any;

    if (ctx.input.userId) {
      result = await client.getUser(ctx.input.userId);
    } else {
      result = await client.getUsers(ctx.input.userType, ctx.input.page, ctx.input.perPage);
    }

    let users = result?.users || [];

    return {
      output: { users },
      message: `Retrieved **${users.length}** user(s).`
    };
  })
  .build();
