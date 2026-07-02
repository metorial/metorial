import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let searchUsersTool = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search for Jira users by name, username, or email. Useful for finding account IDs needed when assigning issues or other operations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query matching display name, email, or username.'),
      startAt: z.number().optional().default(0).describe('Pagination start index.'),
      maxResults: z.number().optional().default(50).describe('Maximum users to return.')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          accountId: z
            .string()
            .describe('The user account ID (used for assigning issues, etc.).'),
          displayName: z.string().describe('The user display name.'),
          emailAddress: z
            .string()
            .optional()
            .describe(
              'The user email address (may not be visible depending on privacy settings).'
            ),
          active: z.boolean().describe('Whether the user account is active.'),
          avatarUrl: z.string().optional().describe('URL to the user avatar.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let users = await client.searchUsers(ctx.input.query, {
      startAt: ctx.input.startAt,
      maxResults: ctx.input.maxResults
    });

    return {
      output: {
        users: users.map((u: any) => ({
          accountId: u.accountId,
          displayName: u.displayName,
          emailAddress: u.emailAddress,
          active: u.active ?? true,
          avatarUrl: u.avatarUrls?.['48x48']
        }))
      },
      message: `Found **${users.length}** users matching "${ctx.input.query}".`
    };
  })
  .build();
