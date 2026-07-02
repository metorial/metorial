import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let searchUsersTool = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search for Jira users by name or email. Returns matching user accounts with their account IDs, display names, and email addresses. Useful for finding user account IDs needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('Search query (name or email address)'),
      maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            accountId: z.string().describe('Unique account ID'),
            displayName: z.string().optional().describe('User display name'),
            emailAddress: z.string().optional().describe('User email address'),
            active: z.boolean().optional().describe('Whether the user account is active'),
            accountType: z
              .string()
              .optional()
              .describe('Account type (e.g., "atlassian", "customer")'),
            avatarUrl: z.string().optional().describe('URL of the user avatar')
          })
        )
        .describe('Matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let results = await client.searchUsers(ctx.input.query, ctx.input.maxResults);

    let users = results.map((u: any) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      emailAddress: u.emailAddress,
      active: u.active,
      accountType: u.accountType,
      avatarUrl: u.avatarUrls?.['48x48']
    }));

    return {
      output: { users },
      message: `Found **${users.length}** users matching "${ctx.input.query}".`
    };
  })
  .build();
