import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { isSlackApiErrorCode, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let fileResultSchema = z.record(z.string(), z.unknown());

export let searchFiles = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description:
    'Search files shared across a Slack workspace with Real-time Search using keywords or a natural-language question. Public-channel search is the default. Widening channelTypes to private channels, DMs, or group DMs requires explicit user consent and the matching granular search scopes, and it never expands access beyond conversations the connected user can already read. Follow file results with read_file to download content.',
  instructions: [
    'Obtain explicit user consent before widening channelTypes beyond public_channel because results may reference private-channel or direct-message files.',
    'Use the structured channelTypes, before, and after parameters to narrow results rather than embedding search modifiers in the query.',
    'Use read_file with a resolved file ID when file content is needed.'
  ],
  constraints: [
    'Requires a user token with search:read.public and search:read.files.',
    'Searching private channels, DMs, or group DMs requires search:read.private, search:read.im, or search:read.mpim for those conversation types and returns only content accessible to the connected user.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.searchFiles)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      query: z
        .string()
        .min(1)
        .describe(
          'Keywords or a natural-language question. Use the structured channelTypes, before, and after parameters to narrow results rather than embedding search modifiers in the query.'
        ),
      channelTypes: z
        .array(z.enum(['public_channel', 'private_channel', 'im', 'mpim']))
        .min(1)
        .optional()
        .describe(
          'Conversation types to search (default: public_channel). Private types require consent and the matching granular search scopes.'
        ),
      before: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return files shared at or before this Unix timestamp.'),
      after: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Only return files shared at or after this Unix timestamp.'),
      includeBots: z
        .boolean()
        .optional()
        .describe('Include files uploaded by bots (default: false).'),
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
      files: z.array(fileResultSchema).describe('Matching files.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let channelTypes = ctx.input.channelTypes ?? ['public_channel'];

    try {
      let result = await client.searchContext({
        query: ctx.input.query,
        contentTypes: ['files'],
        channelTypes,
        before: ctx.input.before,
        after: ctx.input.after,
        includeBots: ctx.input.includeBots ?? false,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit ?? 20,
        sort: ctx.input.sort ?? 'score',
        sortDir: ctx.input.sortDir ?? 'desc'
      });

      let files = result.files ?? [];

      return {
        output: {
          files,
          nextCursor: result.nextCursor
        },
        message: `Found ${files.length} Slack file(s) matching "${ctx.input.query}".`
      };
    } catch (error) {
      if (isSlackApiErrorCode(error, 'missing_scope')) {
        let widened = channelTypes.some(type => type !== 'public_channel');

        throw slackServiceError(
          widened
            ? 'Searching private channels, DMs, or group DMs requires search:read.private, search:read.im, or search:read.mpim in addition to search:read.files. Reconnect with those scopes or request only public_channel results.'
            : 'Slack file search requires the search:read.public and search:read.files scopes. Reconnect with those scopes.'
        );
      }

      throw error;
    }
  })
  .build();
