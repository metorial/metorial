import { SlateTool } from 'slates';
import { z } from 'zod';
import { slackUserAuthMethods } from '../lib/auth-methods';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let fileMatchSchema = z.object({
  fileId: z.string().describe('Slack file ID'),
  name: z.string().optional().describe('Filename'),
  title: z.string().optional().describe('File title'),
  mimetype: z.string().optional().describe('MIME type'),
  filetype: z.string().optional().describe('Slack file type'),
  userId: z.string().optional().describe('User ID of the uploader'),
  size: z.number().optional().describe('File size in bytes'),
  created: z.number().optional().describe('Unix timestamp when the file was created'),
  permalink: z.string().optional().describe('Slack file permalink'),
  urlPrivate: z.string().optional().describe('Private file URL'),
  channels: z.array(z.string()).optional().describe('Channel IDs where this file is shared')
});

export let searchFiles = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description: `Search for files across a Slack workspace by keyword query. Requires a user token with the \`search:read\` scope.`,
  constraints: ['This endpoint requires a user token with the search:read scope.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.search)
  .authMethods(slackUserAuthMethods)
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Search query (supports Slack search modifiers like from:, in:, before:, after:)'
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
      totalCount: z.number().describe('Total number of matching files'),
      matches: z.array(fileMatchSchema).describe('Matching files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let result = await client.searchFiles({
      query: ctx.input.query,
      sort: ctx.input.sort,
      sortDir: ctx.input.sortDir,
      count: ctx.input.count,
      page: ctx.input.page
    });

    let matches = result.files.matches.map((file: any) => ({
      fileId: file.id,
      name: file.name,
      title: file.title,
      mimetype: file.mimetype,
      filetype: file.filetype,
      userId: file.user,
      size: file.size,
      created: file.created || file.timestamp,
      permalink: file.permalink,
      urlPrivate: file.url_private,
      channels: file.channels
    }));

    return {
      output: {
        totalCount: result.files.total,
        matches
      },
      message: `Found **${result.files.total}** file(s) matching "${ctx.input.query}" (showing ${matches.length}).`
    };
  })
  .build();
