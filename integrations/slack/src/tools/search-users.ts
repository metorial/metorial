import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let userResultSchema = z.record(z.string(), z.unknown());

let toConciseUser = (user: Record<string, unknown>) => {
  let profile = (user.profile ?? {}) as Record<string, unknown>;

  return {
    id: user.id,
    name: user.name,
    real_name: user.real_name ?? profile.real_name,
    display_name: user.display_name ?? profile.display_name,
    title: user.title ?? profile.title,
    email: user.email ?? profile.email,
    is_bot: user.is_bot,
    deleted: user.deleted
  };
};

export let searchUsers = SlateTool.create(spec, {
  name: 'Search Users',
  key: 'search_users',
  description:
    'Find Slack people by partial name, email, title, department, role, or other profile terms and return stable user IDs for messages and mentions. Use this query-driven discovery tool when the identity is not yet known; use get_user_info for a known user ID or exact email, a full profile lookup, or paginated member listing.',
  instructions: [
    'Use the returned user ID for direct messages, mentions, and user-scoped searches.',
    'Use get_user_info after resolving an ID when complete profile and status details are needed.'
  ],
  constraints: ['Requires a user token with search:read.users.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.searchUsers)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe('Name, email, title, department, role, or profile terms to search for.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous search.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum users to return (default: 20, max: 20).'),
      includeBots: z.boolean().optional().describe('Include bot users (default: false).'),
      includeDeleted: z
        .boolean()
        .optional()
        .describe('Include deactivated users (default: false).'),
      responseFormat: z
        .enum(['detailed', 'concise'])
        .optional()
        .describe(
          'Return complete Slack user records or concise summaries (default: detailed).'
        )
    })
  )
  .output(
    z.object({
      users: z.array(userResultSchema).describe('Matching Slack user records.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.searchContext({
      query: ctx.input.query,
      contentTypes: ['users'],
      includeBots: ctx.input.includeBots ?? false,
      includeDeletedUsers: ctx.input.includeDeleted ?? false,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit ?? 20,
      sort: 'score',
      sortDir: 'desc'
    });
    let users = result.users ?? [];

    return {
      output: {
        users: ctx.input.responseFormat === 'concise' ? users.map(toConciseUser) : users,
        nextCursor: result.nextCursor
      },
      message: `Found ${users.length} Slack user(s) matching "${ctx.input.query}".`
    };
  })
  .build();
