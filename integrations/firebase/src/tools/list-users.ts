import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { AuthClient } from '../lib/client';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `List Firebase Authentication users with pagination support. Returns user accounts with their properties including email, display name, and account status.`,
  tags: {
    readOnly: true
  }
})
  .scopes(firebaseActionScopes.listUsers)
  .input(
    z.object({
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of users to return per page. Defaults to 100, max 1000.'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token from a previous response for pagination')
    })
  )
  .output(
    z.object({
      users: z
        .array(
          z.object({
            userId: z.string().describe('Firebase user ID'),
            email: z.string().optional().describe('User email address'),
            displayName: z.string().optional().describe('User display name'),
            phoneNumber: z.string().optional().describe('User phone number'),
            photoUrl: z.string().optional().describe('URL of user profile photo'),
            emailVerified: z.boolean().optional().describe('Whether the email is verified'),
            disabled: z.boolean().optional().describe('Whether the account is disabled'),
            createdAt: z.string().optional().describe('Account creation timestamp'),
            lastSignedInAt: z.string().optional().describe('Last sign-in timestamp')
          })
        )
        .describe('List of users'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page'),
      totalReturned: z.number().describe('Number of users returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AuthClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let result = await client.listUsers({
      maxResults: ctx.input.maxResults,
      nextPageToken: ctx.input.pageToken
    });

    return {
      output: {
        users: result.users,
        nextPageToken: result.nextPageToken,
        totalReturned: result.users.length
      },
      message: `Listed **${result.users.length}** user(s).${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
