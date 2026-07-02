import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let searchUsersTool = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description: `Search and list users in your Auth0 tenant. Supports Lucene query syntax for filtering by email, name, connection, metadata, and other user attributes. Returns paginated results with up to 50 users per page.`,
  instructions: [
    'Use Lucene query syntax for the query parameter (e.g., email:"user@example.com" or name:"John").',
    'The search engine v3 is used by default. Results are eventually consistent.'
  ],
  constraints: ['Maximum of 50 users per page, 1000 users total per search criteria.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Lucene query string to filter users (e.g., email:"user@example.com")'),
      page: z.number().optional().describe('Page number (zero-based)'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 50)'),
      sort: z
        .string()
        .optional()
        .describe('Field to sort by with direction (e.g., "created_at:1" for ascending)'),
      connection: z.string().optional().describe('Filter by connection name'),
      includeTotals: z.boolean().optional().describe('Include total count in response')
    })
  )
  .output(
    z.object({
      users: z.array(z.record(z.string(), z.unknown())).describe('Array of user objects'),
      total: z.number().optional().describe('Total number of matching users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = await client.listUsers({
      q: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      connection: ctx.input.connection,
      includeTotals: ctx.input.includeTotals
    });

    let users = Array.isArray(result) ? result : (result.users ?? []);
    let total = result.total;

    return {
      output: { users, total },
      message: `Found ${total !== undefined ? total : users.length} user(s).`
    };
  })
  .build();
