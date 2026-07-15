import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

export type GoogleChatSpace = {
  name?: string;
  displayName?: string;
  spaceType?: string;
  lastActiveTime?: string;
  spaceUri?: string;
};

export type SearchConversationsInput = {
  spaceNameQuery?: string;
  spaceType?: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  pageSize?: number;
  pageToken?: string;
};

export type ListSpacesResponse = {
  spaces?: GoogleChatSpace[];
  nextPageToken?: string;
};

export let buildSearchConversationsRequest = (input: SearchConversationsInput) => ({
  params: pickDefined({
    filter: input.spaceType ? `spaceType = "${input.spaceType}"` : undefined,
    pageSize: input.pageSize ?? 100,
    pageToken: input.pageToken
  })
});

let mapConversationType = (spaceType: string | undefined) => {
  if (spaceType === 'SPACE') return 'NAMED_SPACE' as const;
  if (spaceType === 'GROUP_CHAT') return 'GROUP_CHAT' as const;
  if (spaceType === 'DIRECT_MESSAGE') return 'DIRECT_MESSAGE' as const;
  return 'CONVERSATION_TYPE_UNSPECIFIED' as const;
};

export let filterAndMapConversations = (
  spaces: GoogleChatSpace[],
  spaceNameQuery?: string
) => {
  let normalizedQuery = spaceNameQuery?.trim().toLocaleLowerCase();

  return spaces
    .filter(space => {
      if (!space.name) return false;
      if (!normalizedQuery) return true;
      return [space.displayName, space.name].some(value =>
        value?.toLocaleLowerCase().includes(normalizedQuery)
      );
    })
    .map(space => ({
      conversationId: space.name as string,
      displayName: space.displayName,
      conversationType: mapConversationType(space.spaceType),
      spaceType: space.spaceType,
      lastActiveTimestamp: space.lastActiveTime,
      spaceUri: space.spaceUri
    }));
};

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description:
    'List Google Chat conversations the caller can access, optionally filtering the API page by conversation type and matching display names or resource names case-insensitively.',
  instructions: [
    'Display-name matching is applied to each page returned by spaces.list. An empty conversations array can still have a nextPageToken when later pages may contain matches.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.searchConversations)
  .authMethods(googleChatActionAuthMethods.searchConversations)
  .input(
    z.object({
      spaceNameQuery: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Case-insensitive substring to match in display names or resource names'),
      spaceType: z
        .enum(['SPACE', 'GROUP_CHAT', 'DIRECT_MESSAGE'])
        .optional()
        .describe('Google Chat conversation type to request from spaces.list'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum spaces to request; defaults to 100 and supports up to 1000'),
      pageToken: z.string().trim().min(1).optional().describe('Token for the next result page')
    })
  )
  .output(
    z.object({
      conversations: z
        .array(
          z.object({
            conversationId: z.string().describe('Full Google Chat space resource name'),
            displayName: z.string().optional().describe('Conversation display name'),
            conversationType: z
              .enum([
                'DIRECT_MESSAGE',
                'GROUP_CHAT',
                'NAMED_SPACE',
                'CONVERSATION_TYPE_UNSPECIFIED'
              ])
              .describe('Normalized conversation type'),
            spaceType: z.string().optional().describe('Google Chat spaceType value'),
            lastActiveTimestamp: z
              .string()
              .optional()
              .describe('Timestamp of the last message in the conversation'),
            spaceUri: z.string().optional().describe('Browser URL for the conversation')
          })
        )
        .describe('Conversations matching this page'),
      nextPageToken: z.string().optional().describe('Token for the next spaces.list page'),
      returnedCount: z
        .number()
        .int()
        .nonnegative()
        .describe('Matching conversations returned from this page')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildSearchConversationsRequest(ctx.input);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<ListSpacesResponse>('spaces', {
      method: 'get',
      params: request.params,
      operation: 'search conversations'
    });
    let conversations = filterAndMapConversations(
      response.spaces ?? [],
      ctx.input.spaceNameQuery
    );

    return {
      output: {
        conversations,
        nextPageToken: response.nextPageToken,
        returnedCount: conversations.length
      },
      message: `Found **${conversations.length}** matching conversation(s) in this page${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
