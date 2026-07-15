import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatSpaceName,
  resolveGoogleChatThreadName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  type GoogleChatMessage,
  googleChatMessageOutputSchema,
  mapGoogleChatMessage
} from './send-message';

export type ListMessagesInput = {
  conversationId?: string;
  threadId?: string;
  pageSize?: number;
  pageToken?: string;
  startTime?: string;
  endTime?: string;
  orderBy?: 'ASC' | 'DESC';
};

export type ListMessagesResponse = {
  messages?: GoogleChatMessage[];
  nextPageToken?: string;
};

let parseFilterTime = (value: string | undefined, label: string) => {
  let resolved = value?.trim();
  if (!resolved) return undefined;
  if (Number.isNaN(Date.parse(resolved))) {
    throw googleChatValidationError(`${label} must be a valid ISO 8601 timestamp.`);
  }
  return resolved;
};

export let buildListMessagesRequest = (input: ListMessagesInput, defaultSpace?: string) => {
  let parent = resolveGoogleChatSpaceName(input.conversationId, defaultSpace);
  let threadName = resolveGoogleChatThreadName(input.threadId, parent);
  let startTime = parseFilterTime(input.startTime, 'startTime');
  let endTime = parseFilterTime(input.endTime, 'endTime');

  if (startTime && endTime && Date.parse(startTime) >= Date.parse(endTime)) {
    throw googleChatValidationError('startTime must be earlier than endTime.');
  }

  let filter = [
    threadName ? `thread.name = ${threadName}` : undefined,
    startTime ? `createTime > ${JSON.stringify(startTime)}` : undefined,
    endTime ? `createTime < ${JSON.stringify(endTime)}` : undefined
  ]
    .filter((value): value is string => Boolean(value))
    .join(' AND ');

  return {
    parent,
    params: pickDefined({
      filter: filter || undefined,
      orderBy: `createTime ${input.orderBy ?? 'DESC'}`,
      pageSize: input.pageSize ?? 20,
      pageToken: input.pageToken
    })
  };
};

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description:
    'List messages from a Google Chat conversation with optional thread and time filters, reverse-chronological ordering, and page-token pagination.',
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.listMessages)
  .authMethods(googleChatActionAuthMethods.listMessages)
  .input(
    z.object({
      conversationId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'Conversation resource name (spaces/{space}); uses configured defaultSpace when omitted'
        ),
      threadId: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Thread ID or full resource name to filter messages'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe(
          'Maximum messages to return; defaults to 20 and supports up to 50, the same cap as the official Google Chat MCP surface'
        ),
      pageToken: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Token for the next result page'),
      startTime: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Return messages created after this ISO 8601 timestamp'),
      endTime: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe('Return messages created before this ISO 8601 timestamp'),
      orderBy: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Creation-time sort direction; defaults to DESC (newest first)')
    })
  )
  .output(
    z.object({
      messages: z
        .array(googleChatMessageOutputSchema)
        .describe('Messages in this result page'),
      nextPageToken: z.string().optional().describe('Token for the next result page'),
      returnedCount: z.number().int().nonnegative().describe('Messages returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let request = buildListMessagesRequest(ctx.input, ctx.config.defaultSpace);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<ListMessagesResponse>(`${request.parent}/messages`, {
      method: 'get',
      params: request.params,
      operation: 'list messages'
    });
    let messages = (response.messages ?? []).map(mapGoogleChatMessage);

    return {
      output: {
        messages,
        nextPageToken: response.nextPageToken,
        returnedCount: messages.length
      },
      message: `Found **${messages.length}** message(s) in \`${request.parent}\`${response.nextPageToken ? ' (more pages available)' : ''}.`
    };
  })
  .build();
