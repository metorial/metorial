import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { isSlackApiErrorCode, slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let channelResultSchema = z.record(z.string(), z.unknown());

let extractChannelIdFromPermalink = (permalink: unknown) => {
  if (typeof permalink !== 'string') return undefined;
  return /\/archives\/([A-Z0-9]+)/i.exec(permalink)?.[1];
};

let toConciseChannel = (channel: Record<string, unknown>) => ({
  id: channel.id ?? extractChannelIdFromPermalink(channel.permalink),
  name: channel.name,
  is_private: channel.is_private,
  is_archived: channel.is_archived,
  topic: channel.topic,
  purpose: channel.purpose,
  permalink: channel.permalink
});

export let searchChannels = SlateTool.create(spec, {
  name: 'Search Channels',
  key: 'search_channels',
  description:
    'Find Slack channels by partial name, topic, purpose, or description with bounded Real-time Search. Use this query-driven tool to resolve a channel ID before reads or writes; use list_conversations when you need to browse and paginate the full accessible conversation list. Public-channel search is the default. Private-channel requests search only channels accessible to the connected user and require search:read.private.',
  instructions: [
    'Use the returned channel ID with conversation read or write tools.',
    'Use list_conversations instead when no search terms are known or when exhaustive pagination is required.'
  ],
  constraints: [
    'Requires a user token with search:read.public.',
    'Including private_channel requires search:read.private and returns only channels accessible to the connected user.'
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
        .describe('Partial channel name, topic, purpose, or description to find.'),
      channelTypes: z
        .array(z.enum(['public_channel', 'private_channel']))
        .min(1)
        .optional()
        .describe('Channel types to search (default: public_channel).'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('Include archived channels (default: false).'),
      cursor: z.string().optional().describe('Pagination cursor from a previous search.'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum channels to return (default: 20, max: 20).'),
      responseFormat: z
        .enum(['detailed', 'concise'])
        .optional()
        .describe(
          'Return complete Slack channel records or concise summaries (default: detailed).'
        )
    })
  )
  .output(
    z.object({
      channels: z.array(channelResultSchema).describe('Matching channel records.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let channelTypes = ctx.input.channelTypes ?? ['public_channel'];

    try {
      let result = await client.searchContext({
        query: ctx.input.query,
        contentTypes: ['channels'],
        channelTypes,
        includeArchivedChannels: ctx.input.includeArchived ?? false,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit ?? 20,
        sort: 'score',
        sortDir: 'desc'
      });
      let channels = result.channels ?? [];

      return {
        output: {
          channels:
            ctx.input.responseFormat === 'concise' ? channels.map(toConciseChannel) : channels,
          nextCursor: result.nextCursor
        },
        message: `Found ${channels.length} Slack channel(s) matching "${ctx.input.query}".`
      };
    } catch (error) {
      if (
        isSlackApiErrorCode(error, 'missing_scope') &&
        channelTypes.includes('private_channel')
      ) {
        throw slackServiceError(
          'Private-channel search requires search:read.private. Reconnect with that scope or request only public_channel results.'
        );
      }

      throw error;
    }
  })
  .build();
