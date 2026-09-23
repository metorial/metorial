import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GOOGLE_CHAT_API_BASE_URL, GoogleChatClient } from '../lib/client';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  type GoogleChatSpace,
  googleChatSpaceOutputSchema,
  mapGoogleChatSpace
} from './manage-space';

let adminOrderByValues = [
  'createTime DESC',
  'createTime ASC',
  'lastActiveTime DESC',
  'lastActiveTime ASC',
  'membershipCount.joined_direct_human_user_count DESC',
  'membershipCount.joined_direct_human_user_count ASC'
] as const;

export let searchSpacesAdmin = SlateTool.create(spec, {
  name: 'Search Spaces (Admin)',
  key: 'search_spaces_admin',
  description:
    "Search every named Google Chat space in the organization with Google Workspace administrator privileges, using the Chat admin space search syntax. Returns spaces the administrator isn't a member of.",
  instructions: [
    'Every **query** must include customer = "customers/my_customer" AND spaceType = "SPACE", joined to any other clauses with AND.',
    'Filterable fields: displayName (HAS operator, e.g. displayName:"Project"; a case-insensitive token prefix match), externalUserAllowed ("true" or "false"), spaceHistoryState ("HISTORY_ON" or "HISTORY_OFF"), and createTime / lastActiveTime (quoted RFC 3339 timestamps with =, <, >, <=, or >=).',
    'Different fields combine only with AND. Repeat displayName, externalUserAllowed, or spaceHistoryState with OR inside parentheses; createTime and lastActiveTime accept both OR and AND (use AND to express an interval).',
    'Example: customer = "customers/my_customer" AND spaceType = "SPACE" AND (displayName:"Launch" OR displayName:"Release") AND lastActiveTime > "2026-01-01T00:00:00Z"',
    'Use search_conversations to search only the spaces the signed-in user belongs to.'
  ],
  constraints: [
    'The signed-in user must be a Google Workspace administrator with the Manage Chat and spaces conversations privilege; other users receive a permission error.',
    'Only named spaces (spaceType SPACE) can be searched; group chats and direct messages are not returned.',
    'Queries are limited to 1,000 characters; Google rejects invalid queries with INVALID_ARGUMENT.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.searchSpacesAdmin)
  .authMethods(googleChatActionAuthMethods.searchSpacesAdmin)
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .describe(
          'Admin space search query; must include customer = "customers/my_customer" AND spaceType = "SPACE", e.g. customer = "customers/my_customer" AND spaceType = "SPACE" AND displayName:"Project"'
        ),
      orderBy: z.enum(adminOrderByValues).optional().describe('Result ordering'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum spaces per page (1-1000, default 100)'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Token for the next page; reuse the same query and orderBy')
    })
  )
  .output(
    z.object({
      spaces: z.array(googleChatSpaceOutputSchema).describe('Matching spaces on this page'),
      totalSize: z
        .number()
        .int()
        .optional()
        .describe('Total matching spaces across pages; estimated above 10,000'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<{
      results?: Array<{ space?: GoogleChatSpace }>;
      spaces?: GoogleChatSpace[];
      nextPageToken?: string;
      totalSize?: number;
    }>(`${GOOGLE_CHAT_API_BASE_URL}spaces:search`, {
      method: 'get',
      params: pickDefined({
        useAdminAccess: true,
        query: ctx.input.query,
        orderBy: ctx.input.orderBy,
        pageSize: ctx.input.pageSize,
        pageToken: ctx.input.pageToken
      }),
      operation: 'admin search spaces'
    });

    let rawSpaces =
      response.results?.map(result => result.space).filter(space => space !== undefined) ??
      response.spaces ??
      [];
    let spaces = (rawSpaces as GoogleChatSpace[]).map(mapGoogleChatSpace);

    return {
      output: {
        spaces,
        totalSize: response.totalSize,
        nextPageToken: response.nextPageToken || undefined
      },
      message: `Found **${spaces.length}** space(s)${
        response.totalSize !== undefined ? ` of ${response.totalSize} total` : ''
      }.`
    };
  })
  .build();
