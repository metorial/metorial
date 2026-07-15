import { isServiceError } from '@lowerdeck/error';
import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import { resolveGoogleChatSpaceName } from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import type { ListMessagesResponse } from './list-messages';
import {
  type GoogleChatMessage,
  googleChatMessageOutputSchema,
  mapGoogleChatMessage
} from './send-message';

export let SEARCH_MESSAGES_FALLBACK_MAX_PAGES = 5;
export let SEARCH_MESSAGES_FALLBACK_PAGE_SIZE = 50;

export type SearchMessagesInput = {
  query: string;
  conversationId?: string;
  orderBy?: 'createTime desc' | 'relevance desc';
  pageSize?: number;
  pageToken?: string;
};

export type SearchMessagesResponse = {
  results?: Array<{
    message?: GoogleChatMessage;
    spaceMuteSetting?: string;
    read?: boolean;
  }>;
  nextPageToken?: string;
};

export let buildSearchMessagesRequest = (input: SearchMessagesInput) => ({
  parent: 'spaces/-',
  data: pickDefined({
    filter: input.query.trim(),
    orderBy: input.orderBy ?? 'createTime desc',
    pageSize: input.pageSize ?? 25,
    pageToken: input.pageToken
  })
});

export let isSearchApiUnavailableError = (error: unknown) => {
  if (!isServiceError(error)) return false;
  let status = error.data.upstreamStatus;
  if (status === 403 || status === '403' || status === 404 || status === '404') return true;
  return typeof error.message === 'string' && error.message.includes('PERMISSION_DENIED');
};

export type SearchMessagesFallbackPlan = {
  parent: string;
  filter?: string;
  terms: string[];
};

export let buildSearchMessagesFallbackPlan = (
  input: SearchMessagesInput
): SearchMessagesFallbackPlan => {
  if (!input.conversationId?.trim()) {
    throw createApiServiceError(
      'Google Chat messages:search is unavailable for this account because it requires Google Workspace Developer Preview enrollment. Provide conversationId so the tool can fall back to searching one conversation through spaces.messages.list.',
      { reason: 'google_chat_search_preview_unavailable' }
    );
  }
  if (input.pageToken) {
    throw googleChatValidationError(
      'pageToken values issued by the Google Chat search API cannot be used with the spaces.messages.list fallback. Retry without pageToken.'
    );
  }

  let parent = resolveGoogleChatSpaceName(input.conversationId);
  let filterClauses: string[] = [];
  let remaining = input.query.replace(
    /\bcreateTime\s*(>=|<=|>|<)\s*("[^"]*"|\S+)/g,
    (_match, operator: string, value: string) => {
      let quoted = value.startsWith('"') ? value : JSON.stringify(value);
      filterClauses.push(`createTime ${operator} ${quoted}`);
      return ' ';
    }
  );

  remaining = remaining
    .replace(/\b[\w.]+\s*!?=\s*("[^"]*"|\S+)/g, ' ')
    .replace(/\b\w+\s*:\s*("[^"]*"|\*|\S+)/g, ' ')
    .replace(/\b\w+\(\)/g, ' ')
    .replace(/\b(AND|OR|NOT)\b/g, ' ')
    .replace(/[()]/g, ' ');

  let terms: string[] = [];
  for (let match of remaining.matchAll(/"([^"]*)"|(\S+)/g)) {
    let term = (match[1] ?? match[2] ?? '').trim().toLowerCase();
    if (term && !terms.includes(term)) terms.push(term);
  }
  if (terms.length === 0) {
    throw googleChatValidationError(
      'The spaces.messages.list search fallback needs at least one plain keyword or quoted phrase in query; it can apply createTime filters but no other structured search filters.'
    );
  }

  return {
    parent,
    filter: filterClauses.join(' AND ') || undefined,
    terms
  };
};

export let matchesSearchFallbackTerms = (message: GoogleChatMessage, terms: string[]) => {
  let haystack = `${message.text ?? ''}\n${message.formattedText ?? ''}`.toLowerCase();
  return terms.every(term => haystack.includes(term));
};

let runSearchMessagesFallback = async (
  input: SearchMessagesInput,
  client: GoogleChatClient
) => {
  let plan = buildSearchMessagesFallbackPlan(input);
  let limit = input.pageSize ?? 25;
  let matches: ReturnType<typeof mapGoogleChatMessage>[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < SEARCH_MESSAGES_FALLBACK_MAX_PAGES; page += 1) {
    let response = await client.request<ListMessagesResponse>(`${plan.parent}/messages`, {
      method: 'get',
      params: pickDefined({
        filter: plan.filter,
        orderBy: 'createTime DESC',
        pageSize: SEARCH_MESSAGES_FALLBACK_PAGE_SIZE,
        pageToken
      }),
      operation: 'search messages (list fallback)'
    });

    for (let message of response.messages ?? []) {
      if (matches.length >= limit) break;
      if (matchesSearchFallbackTerms(message, plan.terms)) {
        matches.push(mapGoogleChatMessage(message));
      }
    }

    pageToken = response.nextPageToken;
    if (matches.length >= limit || !pageToken) break;
  }

  return { plan, messages: matches };
};

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description:
    'Search messages across Google Chat using the Developer Preview messages.search API, including keyword and provider-supported message filters. When the search API is unavailable (HTTP 403/404 without Developer Preview enrollment), the tool falls back to spaces.messages.list on one conversation with client-side keyword matching.',
  constraints: [
    'The primary path uses a Google Workspace Developer Preview API and requires user OAuth.',
    'Google Chat search omits private messages, app-authored messages in spaces or group chats, Chat app direct messages, messages from blocked users, and messages in muted spaces.',
    'The list fallback requires conversationId, searches only that single conversation, matches keywords and quoted phrases case-insensitively against message text, and applies only the createTime filters supported by spaces.messages.list; other structured filters and relevance ordering are not applied.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.searchMessages)
  .authMethods(googleChatActionAuthMethods.searchMessages)
  .input(
    z.object({
      query: z
        .string()
        .trim()
        .min(1)
        .max(1000)
        .describe(
          'Google Chat search query with keywords and supported filters such as sender.name, space.name, space.display_name, createTime, attachment:*, has_link(), and is_unread()'
        ),
      conversationId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Conversation ID or spaces/{space} resource name that scopes the spaces.messages.list fallback when the search API is unavailable; the search API path scopes by space through space.name clauses in query instead'
        ),
      orderBy: z
        .enum(['createTime desc', 'relevance desc'])
        .optional()
        .describe(
          'Sort by newest first (default) or descending relevance; the list fallback always returns newest first'
        ),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum results to return; defaults to 25 and supports up to 100'),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Token for the next result page; valid only for the search API path, not the list fallback'
        )
    })
  )
  .output(
    z.object({
      messages: z.array(googleChatMessageOutputSchema).describe('Messages matching the query'),
      nextPageToken: z.string().optional().describe('Token for the next result page'),
      returnedCount: z.number().int().nonnegative().describe('Messages returned in this page'),
      searchMethod: z
        .enum(['search_api', 'list_fallback'])
        .describe(
          'Which path served the request: the Developer Preview search API or the spaces.messages.list keyword fallback'
        )
    })
  )
  .handleInvocation(async ctx => {
    let request = buildSearchMessagesRequest(ctx.input);
    let client = new GoogleChatClient(ctx.auth.token);
    let response: SearchMessagesResponse;

    try {
      response = await client.request<SearchMessagesResponse>(
        `${request.parent}/messages:search`,
        {
          method: 'post',
          data: request.data,
          operation: 'search messages'
        }
      );
    } catch (error) {
      if (!isSearchApiUnavailableError(error)) throw error;

      let fallback = await runSearchMessagesFallback(ctx.input, client);
      return {
        output: {
          messages: fallback.messages,
          nextPageToken: undefined,
          returnedCount: fallback.messages.length,
          searchMethod: 'list_fallback' as const
        },
        message: `Found **${fallback.messages.length}** message(s) via the spaces.messages.list fallback in \`${fallback.plan.parent}\` because the Google Chat search API is unavailable without Developer Preview access. Fallback semantics are weaker than the search API: single conversation, case-insensitive text-contains keyword matching over up to ${SEARCH_MESSAGES_FALLBACK_MAX_PAGES * SEARCH_MESSAGES_FALLBACK_PAGE_SIZE} recent messages, and only createTime filters supported by spaces.messages.list.`
      };
    }

    let messages = (response.results ?? [])
      .map(result => result.message)
      .filter((message): message is GoogleChatMessage => Boolean(message))
      .map(mapGoogleChatMessage);

    return {
      output: {
        messages,
        nextPageToken: response.nextPageToken,
        returnedCount: messages.length,
        searchMethod: 'search_api' as const
      },
      message: `Found **${messages.length}** message(s) matching the search query via the Google Chat search API${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
