import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search for messages across a Slack workspace by keyword query. Results include the message text, channel, sender, and timestamp. Requires a user token with the \`search:read\` user scope.`,
  constraints: ['This endpoint requires a user token with the search:read scope.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.search)
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query (supports Slack search modifiers like from:, in:, has:, before:, after:)'
        ),
      sort: z
        .enum(['score', 'timestamp'])
        .optional()
        .describe('Sort results by relevance score or timestamp'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      count: z.number().optional().describe('Number of results per page (default 20)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching messages'),
      matches: z
        .array(
          z.object({
            text: z.string().optional().describe('Message text'),
            channelId: z
              .string()
              .optional()
              .describe('Channel ID where the message was found'),
            channelName: z.string().optional().describe('Channel name'),
            userId: z.string().optional().describe('User ID of the message author'),
            username: z.string().optional().describe('Username of the message author'),
            ts: z.string().optional().describe('Message timestamp'),
            permalink: z.string().optional().describe('Permalink to the message')
          })
        )
        .describe('Matching messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);

    let result = await client.searchMessages({
      query: ctx.input.query,
      sort: ctx.input.sort,
      sortDir: ctx.input.sortDir,
      count: ctx.input.count,
      page: ctx.input.page
    });

    let matches = result.messages.matches.map((m: any) => ({
      text: m.text,
      channelId: m.channel?.id,
      channelName: m.channel?.name,
      userId: m.user,
      username: m.username,
      ts: m.ts,
      permalink: m.permalink
    }));

    return {
      output: {
        totalCount: result.messages.total,
        matches
      },
      message: `Found **${result.messages.total}** message(s) matching "${ctx.input.query}" (showing ${matches.length}).`
    };
  })
  .build();
