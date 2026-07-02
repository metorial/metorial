import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listUsers = SlateTool.create(spec, {
  name: 'List Users',
  key: 'list_users',
  description: `Search and list users in FullStory. Filter by uid, email, display name, or identification status. Results are paginated.`,
  constraints: ['Requires an Admin or Architect API key.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      uid: z.string().optional().describe("Filter by your application's user ID"),
      email: z.string().optional().describe('Filter by email address'),
      displayName: z.string().optional().describe('Filter by display name'),
      isIdentified: z
        .boolean()
        .optional()
        .describe('Filter by identified status (true = identified users only)'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token for retrieving the next page')
    })
  )
  .output(
    z.object({
      users: z.array(
        z.object({
          userId: z.string().describe('FullStory-generated user ID'),
          uid: z.string().optional().describe("Your application's user ID"),
          displayName: z.string().optional().describe('Display name'),
          email: z.string().optional().describe('Email address'),
          appUrl: z.string().optional().describe('URL to view this user in FullStory')
        })
      ),
      nextPageToken: z
        .string()
        .optional()
        .describe('Token for the next page, absent if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listUsers({
      uid: ctx.input.uid,
      email: ctx.input.email,
      displayName: ctx.input.displayName,
      isIdentified: ctx.input.isIdentified,
      pageToken: ctx.input.pageToken
    });

    let users = result.users.map(u => ({
      userId: u.userId,
      uid: u.uid,
      displayName: u.displayName,
      email: u.email,
      appUrl: u.appUrl
    }));

    return {
      output: {
        users,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${users.length}** users.${result.nextPageToken ? ' More results available.' : ''}`
    };
  })
  .build();
