import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GOOGLE_CHAT_API_BASE_URL, GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
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

export type SearchSpacesAdminInput = {
  query?: string;
  displayNames?: string[];
  externalUserAllowed?: boolean;
  spaceHistoryStates?: Array<'HISTORY_ON' | 'HISTORY_OFF'>;
  createdAfter?: string;
  createdBefore?: string;
  lastActiveAfter?: string;
  lastActiveBefore?: string;
};

let quote = (value: string) => JSON.stringify(value);

let requireTimestamp = (value: string, field: string) => {
  if (Number.isNaN(Date.parse(value))) {
    throw googleChatValidationError(`${field} must be an RFC 3339 timestamp.`);
  }
  return quote(value);
};

let orGroup = (terms: string[]) =>
  terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`;

/**
 * Builds a spaces.search admin query. customer and spaceType are always
 * required by the API for admin searches, so structured inputs add them.
 */
export let buildSearchSpacesAdminQuery = (input: SearchSpacesAdminInput) => {
  let structuredKeys: Array<keyof SearchSpacesAdminInput> = [
    'displayNames',
    'externalUserAllowed',
    'spaceHistoryStates',
    'createdAfter',
    'createdBefore',
    'lastActiveAfter',
    'lastActiveBefore'
  ];
  let usesStructured = structuredKeys.some(key => input[key] !== undefined);
  let rawQuery = input.query?.trim();

  if (rawQuery) {
    if (usesStructured) {
      throw googleChatValidationError(
        'Provide either query or the structured filters (displayNames, externalUserAllowed, spaceHistoryStates, and time ranges), not both.'
      );
    }
    return rawQuery;
  }

  let clauses = ['customer = "customers/my_customer"', 'spaceType = "SPACE"'];
  let displayNames = (input.displayNames ?? []).map(name => name.trim()).filter(Boolean);
  if (displayNames.length > 0) {
    clauses.push(orGroup(displayNames.map(name => `displayName:${quote(name)}`)));
  }
  if (input.externalUserAllowed !== undefined) {
    clauses.push(`externalUserAllowed = ${quote(String(input.externalUserAllowed))}`);
  }
  if (input.spaceHistoryStates?.length) {
    clauses.push(
      orGroup(input.spaceHistoryStates.map(state => `spaceHistoryState = ${quote(state)}`))
    );
  }

  let range = (field: string, after?: string, before?: string) => {
    let terms = [
      after !== undefined
        ? `${field} > ${requireTimestamp(after, `${field} lower bound`)}`
        : '',
      before !== undefined
        ? `${field} < ${requireTimestamp(before, `${field} upper bound`)}`
        : ''
    ].filter(Boolean);
    if (terms.length === 0) return;
    clauses.push(terms.length === 1 ? terms[0]! : `(${terms.join(' AND ')})`);
  };
  range('createTime', input.createdAfter, input.createdBefore);
  range('lastActiveTime', input.lastActiveAfter, input.lastActiveBefore);

  return clauses.join(' AND ');
};

export let searchSpacesAdmin = SlateTool.create(spec, {
  name: 'Search Spaces (Admin)',
  key: 'search_spaces_admin',
  description:
    "Search every named Google Chat space in the organization with Google Workspace administrator privileges, filtering by display name, external access, history state, and creation or last-activity time. Returns spaces the administrator isn't a member of.",
  instructions: [
    'Use the structured filters for common searches; the tool adds the required customer = "customers/my_customer" AND spaceType = "SPACE" terms.',
    'Or pass a raw **query** in the Chat admin search syntax, for example: customer = "customers/my_customer" AND spaceType = "SPACE" AND displayName:"Project". A raw query must include both the customer and spaceType terms.',
    'displayName matching is a case-insensitive token prefix match. Different fields combine with AND; the same field combines with OR.',
    'Use search_conversations to search only the spaces the signed-in user belongs to.'
  ],
  constraints: [
    'The signed-in user must be a Google Workspace administrator with the Manage Chat and spaces conversations privilege; other users receive a permission error.',
    'Only named spaces (spaceType SPACE) can be searched; group chats and direct messages are not returned.',
    'Queries are limited to 1,000 characters.'
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
        .optional()
        .describe(
          'Raw admin search query; must include customer = "customers/my_customer" AND spaceType = "SPACE". Cannot be combined with the structured filters.'
        ),
      displayNames: z
        .array(z.string().trim().min(1))
        .optional()
        .describe('Match spaces whose display name contains any of these terms'),
      externalUserAllowed: z
        .boolean()
        .optional()
        .describe(
          'Only spaces that allow (true) or block (false) users outside the organization'
        ),
      spaceHistoryStates: z
        .array(z.enum(['HISTORY_ON', 'HISTORY_OFF']))
        .optional()
        .describe('Only spaces with any of these message history states'),
      createdAfter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('RFC 3339 lower bound on createTime'),
      createdBefore: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('RFC 3339 upper bound on createTime'),
      lastActiveAfter: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('RFC 3339 lower bound on lastActiveTime'),
      lastActiveBefore: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('RFC 3339 upper bound on lastActiveTime'),
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
      query: z.string().describe('Search query sent to Google Chat'),
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
    let query = buildSearchSpacesAdminQuery(ctx.input);
    if (query.length > 1000) {
      throw googleChatValidationError(
        'The search query exceeds 1,000 characters; use fewer filters or display names.'
      );
    }

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
        query,
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
        query,
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
