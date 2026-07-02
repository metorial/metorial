import { SlateTool } from 'slates';
import { z } from 'zod';
import { createCognitoClient, formatAttributes } from '../lib/helpers';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List users in a Cognito user pool. Supports filtering by attributes such as email, username, phone_number, name, given_name, family_name, preferred_username, sub, and status. Supports pagination for large user directories.`,
  instructions: [
    'Filter syntax: "attributeName filterType \\"value\\"" where filterType is = (exact) or ^= (prefix). Example: "email = \\"test@example.com\\""',
    'Searchable attributes: username, email, phone_number, name, given_name, family_name, preferred_username, cognito:user_status, status, sub'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userPoolId: z.string().describe('User pool ID to list users from'),
      filter: z
        .string()
        .optional()
        .describe('Filter expression (e.g., "email ^= \\"test\\"")'),
      limit: z
        .number()
        .min(1)
        .max(60)
        .optional()
        .describe('Maximum number of users to return (1-60)'),
      paginationToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          username: z.string(),
          attributes: z.record(z.string(), z.string()),
          enabled: z.boolean(),
          userStatus: z.string(),
          creationDate: z.number().optional(),
          lastModifiedDate: z.number().optional()
        })
      ),
      paginationToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createCognitoClient(ctx);

    let result = await client.listUsers(ctx.input.userPoolId, {
      filter: ctx.input.filter,
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken
    });

    let users = (result.Users || []).map((u: any) => ({
      username: u.Username,
      attributes: formatAttributes(u.Attributes || []),
      enabled: u.Enabled,
      userStatus: u.UserStatus,
      creationDate: u.UserCreateDate,
      lastModifiedDate: u.UserLastModifiedDate
    }));

    return {
      output: {
        users,
        paginationToken: result.PaginationToken
      },
      message: `Found **${users.length}** user(s) in pool **${ctx.input.userPoolId}**.${result.PaginationToken ? ' More results available.' : ''}`
    };
  })
  .build();
