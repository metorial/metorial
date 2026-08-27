import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { isSlackApiErrorCode, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let searchResultSchema = z.record(z.string(), z.unknown());

export let searchPublic = SlateTool.create(spec, {
  name: 'Search Public Content',
  key: 'search_public',
  description:
    'Search messages and other discoverable content in public Slack channels with Real-time Search. This tool never searches private channels, DMs, or group DMs; use search_public_and_private only after the user has consented to that broader search. Results default to messages. File and user result types require the connected user token to have the matching granular search scopes.',
  instructions: [
    'Use several focused queries and follow important message results with read_thread or conversation reads.',
    'Use search_channels to resolve channel names and search_users to resolve people before composing channel- or person-scoped queries.',
    'The legacy search_messages and search_files tools remain available for legacy user-token search behavior.'
  ],
  constraints: [
    'Requires a user token with search:read.public.',
    'File results require search:read.files, and user results require search:read.users.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.searchPublic)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'Keywords or a natural-language question. Use the structured before, after, and contextChannelId parameters to narrow results rather than embedding search modifiers in the query.'
        ),
      contentTypes: z
        .array(z.enum(['messages', 'files', 'channels', 'users']))
        .min(1)
        .optional()
        .describe('Result types to include (default: messages).'),
      before: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return content at or before this Unix timestamp.'),
      after: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return content at or after this Unix timestamp.'),
      includeBots: z
        .boolean()
        .optional()
        .describe('Include content authored by bots (default: false).'),
      includeContextMessages: z
        .boolean()
        .optional()
        .describe('Include surrounding messages when Slack provides them.'),
      contextChannelId: z
        .string()
        .optional()
        .describe('Public channel ID to use as a relevance-ranking hint.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous search.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum results to return (default: 20, max: 20).'),
      sort: z
        .enum(['score', 'timestamp'])
        .optional()
        .describe('Sort by relevance or timestamp (default: score).'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: desc).')
    })
  )
  .output(
    z.object({
      messages: z.array(searchResultSchema).describe('Matching public messages.'),
      files: z.array(searchResultSchema).describe('Matching public files.'),
      channels: z.array(searchResultSchema).describe('Matching public channels.'),
      users: z.array(searchResultSchema).describe('Matching users.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let contentTypes = ctx.input.contentTypes ?? ['messages'];

    try {
      let result = await client.searchContext({
        query: ctx.input.query,
        contentTypes,
        channelTypes: ['public_channel'],
        before: ctx.input.before,
        after: ctx.input.after,
        includeBots: ctx.input.includeBots ?? false,
        includeContextMessages: ctx.input.includeContextMessages,
        contextChannelId: ctx.input.contextChannelId,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit ?? 20,
        sort: ctx.input.sort ?? 'score',
        sortDir: ctx.input.sortDir ?? 'desc'
      });

      let messages = result.messages ?? [];
      let files = result.files ?? [];
      let channels = result.channels ?? [];
      let users = result.users ?? [];
      let count = messages.length + files.length + channels.length + users.length;

      return {
        output: {
          messages,
          files,
          channels,
          users,
          nextCursor: result.nextCursor
        },
        message: `Found ${count} public Slack search result(s) for "${ctx.input.query}".`
      };
    } catch (error) {
      if (isSlackApiErrorCode(error, 'missing_scope')) {
        let optionalScopes = [
          contentTypes.includes('files') ? 'search:read.files' : undefined,
          contentTypes.includes('users') ? 'search:read.users' : undefined
        ].filter(Boolean);
        let scopeHint = optionalScopes.length
          ? ` Add ${optionalScopes.join(' and ')} or request only messages/channels.`
          : '';

        throw slackServiceError(
          `Slack Real-time Search is missing a required granular scope.${scopeHint}`
        );
      }

      throw error;
    }
  })
  .build();
