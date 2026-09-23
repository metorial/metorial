import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleChatClient } from '../lib/client';
import { googleChatValidationError } from '../lib/errors';
import {
  resolveGoogleChatSpaceName,
  resolveGoogleChatThreadName
} from '../lib/resource-names';
import { googleChatActionAuthMethods, googleChatActionScopes } from '../scopes';
import { spec } from '../spec';

type GoogleChatReadState = {
  name?: string;
  lastReadTime?: string;
};

let MARK_AS_READ_LEAD_MS = 24 * 60 * 60 * 1000;

let spaceInput = z
  .string()
  .trim()
  .min(1)
  .optional()
  .describe(
    'Space ID or spaces/{space} resource name; defaults to defaultSpace. Call search_conversations to discover spaces.'
  );

let mapReadState = (readState: GoogleChatReadState, fallbackName: string) => ({
  readStateName: readState.name ?? fallbackName,
  lastReadTime: readState.lastReadTime
});

// Read state methods only accept the calling user, so the tools always use users/me.
let spaceReadStatePath = (spaceName: string) => `users/me/${spaceName}/spaceReadState`;

export let getSpaceReadState = SlateTool.create(spec, {
  name: 'Get Space Read State',
  key: 'get_space_read_state',
  description:
    "Get the signed-in user's read position in a Google Chat space: the last time they read the space's top-level conversation. Messages created after lastReadTime are unread.",
  instructions: [
    'Thread replies have their own read state; use get_thread_read_state for a thread.'
  ],
  constraints: ["Returns only the signed-in user's own read state."],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.getSpaceReadState)
  .authMethods(googleChatActionAuthMethods.getSpaceReadState)
  .input(z.object({ space: spaceInput }))
  .output(
    z.object({
      spaceName: z.string().describe('Space resource name'),
      readStateName: z
        .string()
        .describe('Read state resource name, users/{user}/spaces/{space}/spaceReadState'),
      lastReadTime: z
        .string()
        .optional()
        .describe('Time the user last read the space; later messages are unread')
    })
  )
  .handleInvocation(async ctx => {
    let spaceName = resolveGoogleChatSpaceName(ctx.input.space, ctx.config.defaultSpace);
    let path = spaceReadStatePath(spaceName);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatReadState>(path, {
      method: 'get',
      operation: 'get space read state'
    });
    let readState = mapReadState(response, path);

    return {
      output: { spaceName, ...readState },
      message: readState.lastReadTime
        ? `Space \`${spaceName}\` was last read at ${readState.lastReadTime}.`
        : `Space \`${spaceName}\` has no recorded read time.`
    };
  })
  .build();

export let getThreadReadState = SlateTool.create(spec, {
  name: 'Get Thread Read State',
  key: 'get_thread_read_state',
  description:
    "Get the signed-in user's read position in a Google Chat thread: the last time they read replies in that thread. Replies created after lastReadTime are unread.",
  constraints: ["Returns only the signed-in user's own read state."],
  tags: {
    readOnly: true
  }
})
  .scopes(googleChatActionScopes.getThreadReadState)
  .authMethods(googleChatActionAuthMethods.getThreadReadState)
  .input(
    z.object({
      space: spaceInput,
      thread: z
        .string()
        .trim()
        .min(1)
        .describe(
          'Thread ID or spaces/{space}/threads/{thread} resource name, as returned in a message thread field'
        )
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Space resource name'),
      threadName: z.string().describe('Thread resource name'),
      readStateName: z
        .string()
        .describe(
          'Read state resource name, users/{user}/spaces/{space}/threads/{thread}/threadReadState'
        ),
      lastReadTime: z
        .string()
        .optional()
        .describe('Time the user last read the thread; later replies are unread')
    })
  )
  .handleInvocation(async ctx => {
    let threadInput = ctx.input.thread.trim();
    let threadSpace = threadInput.match(/^(spaces\/[^/]+)\/threads\//)?.[1];
    let spaceName = resolveGoogleChatSpaceName(
      ctx.input.space ?? threadSpace,
      ctx.config.defaultSpace
    );
    // Rejects a canonical thread name that belongs to a different space.
    let threadName = resolveGoogleChatThreadName(threadInput, spaceName);
    if (!threadName) throw googleChatValidationError('thread is required.');

    let path = `users/me/${threadName}/threadReadState`;
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatReadState>(path, {
      method: 'get',
      operation: 'get thread read state'
    });
    let readState = mapReadState(response, path);

    return {
      output: { spaceName, threadName, ...readState },
      message: readState.lastReadTime
        ? `Thread \`${threadName}\` was last read at ${readState.lastReadTime}.`
        : `Thread \`${threadName}\` has no recorded read time.`
    };
  })
  .build();

export let updateSpaceReadState = SlateTool.create(spec, {
  name: 'Update Space Read State',
  key: 'update_space_read_state',
  description:
    'Mark a Google Chat space as read or unread for the signed-in user by moving their last-read time. Set markAsRead to true to mark everything read, or pass lastReadTime to mark later messages unread.',
  instructions: [
    'Use markAsRead=true to mark the whole space as read.',
    "Use lastReadTime with a timestamp earlier than the newest message to make the space show as unread; Google adjusts the value to the nearest message's creation time.",
    'Only top-level messages are affected; thread replies keep their own read state.'
  ],
  constraints: ["Changes only the signed-in user's own read state."],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleChatActionScopes.updateSpaceReadState)
  .authMethods(googleChatActionAuthMethods.updateSpaceReadState)
  .input(
    z.object({
      space: spaceInput,
      markAsRead: z
        .boolean()
        .optional()
        .describe(
          'true marks the space read up to its latest message (thread replies keep their own thread read state); cannot be combined with lastReadTime'
        ),
      lastReadTime: z.iso
        .datetime({ offset: true })
        .optional()
        .describe(
          'RFC 3339 timestamp to set as the last-read time, e.g. 2026-01-01T00:00:00Z; messages after it become unread'
        )
    })
  )
  .output(
    z.object({
      spaceName: z.string().describe('Space resource name'),
      readStateName: z.string().describe('Read state resource name'),
      lastReadTime: z.string().optional().describe('Last-read time Google stored')
    })
  )
  .handleInvocation(async ctx => {
    let { markAsRead, lastReadTime } = ctx.input;
    if (markAsRead !== undefined && lastReadTime !== undefined) {
      throw googleChatValidationError('Provide either markAsRead or lastReadTime, not both.');
    }
    if (markAsRead === false) {
      throw googleChatValidationError(
        'markAsRead=false is not supported; pass lastReadTime earlier than the newest message to mark the space unread.'
      );
    }
    if (markAsRead === undefined && lastReadTime === undefined) {
      throw googleChatValidationError('Provide markAsRead=true or a lastReadTime.');
    }
    // users.spaces.updateSpaceReadState: "To mark the space as read, set lastReadTime to
    // any value later (larger) than the latest message create time. The lastReadTime is
    // coerced to match the latest message create time." A day ahead absorbs clock skew.
    let timestamp = lastReadTime ?? new Date(Date.now() + MARK_AS_READ_LEAD_MS).toISOString();

    let spaceName = resolveGoogleChatSpaceName(ctx.input.space, ctx.config.defaultSpace);
    let path = spaceReadStatePath(spaceName);
    let client = new GoogleChatClient(ctx.auth.token);
    let response = await client.request<GoogleChatReadState>(path, {
      method: 'patch',
      params: { updateMask: 'lastReadTime' },
      data: { lastReadTime: timestamp },
      operation: 'update space read state'
    });
    let readState = mapReadState(response, path);

    return {
      output: { spaceName, ...readState },
      message: markAsRead
        ? `Marked \`${spaceName}\` as read${readState.lastReadTime ? ` (last read ${readState.lastReadTime})` : ''}.`
        : `Set the last-read time for \`${spaceName}\` to ${readState.lastReadTime ?? timestamp}.`
    };
  })
  .build();
