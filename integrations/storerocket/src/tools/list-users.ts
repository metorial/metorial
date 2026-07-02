import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Lists all users associated with your StoreRocket account. Returns user roles and permissions, supporting team access audits. Supports pagination via limit and offset parameters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Maximum number of users to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of users to skip for pagination')
    })
  )
  .output(
    z.object({
      users: z.any().describe('List of users with their roles and permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getUsers({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        users: result
      },
      message: `Successfully retrieved users from StoreRocket.`
    };
  })
  .build();
