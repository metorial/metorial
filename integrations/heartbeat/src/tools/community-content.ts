import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CommunityClient } from '../lib/client';
import {
  type Channel,
  type Comment,
  channelSchema,
  commentSchema,
  type Event,
  eventSchema,
  mutationSchema,
  type Role,
  roleSchema,
  type Thread,
  threadSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let listCommunityChannels = SlateTool.create(spec, {
  key: 'list_community_channels',
  name: 'List Community Channels',
  description:
    'List all community channels with provider channel types and draft state. This endpoint is not paginated.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ channels: z.array(channelSchema) }))
  .handleInvocation(async ctx => {
    let channels = await new CommunityClient(ctx.auth.token).request<Channel[]>(
      'GET',
      '/channels'
    );
    return { output: { channels }, message: `Retrieved ${channels.length} channel(s).` };
  })
  .build();

export let listChannelCategories = SlateTool.create(spec, {
  key: 'list_channel_categories',
  name: 'List Channel Categories',
  description:
    'Discover the channel category IDs and names needed to create community channels.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(z.object({ categories: z.array(roleSchema) }))
  .handleInvocation(async ctx => {
    let categories = await new CommunityClient(ctx.auth.token).request<Role[]>(
      'GET',
      '/channelCategories'
    );
    return {
      output: { categories },
      message: `Retrieved ${categories.length} channel category or categories.`
    };
  })
  .build();

export let createCommunityChannel = SlateTool.create(spec, {
  key: 'create_community_channel',
  name: 'Create Community Channel',
  description:
    'Create a thread, chat, or voice channel using a category ID from list_channel_categories. Returns the actual HTTP status and provider response.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string(),
      channelType: z.enum(['POSTS', 'CHAT', 'VOICE']),
      channelCategoryId: z.string().describe('Category ID from list_channel_categories'),
      isPrivate: z.boolean(),
      description: z.string().optional(),
      invitedUsers: z
        .array(z.string())
        .optional()
        .describe('Emails allowed to access a private channel'),
      invitedGroups: z
        .array(z.string())
        .optional()
        .describe('Group IDs allowed to access a private channel'),
      isReadOnly: z.boolean().optional().describe('Only available for POSTS channels')
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let { channelType, channelCategoryId, isReadOnly, ...channel } = ctx.input;
    if (channelType !== 'POSTS' && isReadOnly !== undefined) {
      throw createApiServiceError('isReadOnly can only be provided for POSTS channels.');
    }
    let data =
      channelType === 'VOICE'
        ? { ...channel, channelCategoryID: channelCategoryId }
        : { ...channel, channelCategoryID: channelCategoryId, channelType, isReadOnly };
    let output = await new CommunityClient(ctx.auth.token).mutate(
      'PUT',
      channelType === 'VOICE' ? '/voiceChannels' : '/channels',
      data
    );
    return { output, message: 'Heartbeat accepted the channel creation request.' };
  })
  .build();

export let listChannelThreads = SlateTool.create(spec, {
  key: 'list_channel_threads',
  name: 'List Channel Threads',
  description:
    'Read threads from one channel, newest by creation time first. Discover channel IDs with list_community_channels. Responses retain provider permalinks, file URLs, comments, and other metadata.',
  instructions: [
    'To continue, pass nextStartingAfter as startingAfter. A cursor is the last returned ID and does not guarantee another nonempty page. Omitting limit preserves the provider default of 20.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID from list_community_channels'),
      startingAfter: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(
    z.object({
      threads: z.array(threadSchema),
      nextStartingAfter: z
        .string()
        .optional()
        .describe('Last returned thread ID, if available; not a guarantee of another page')
    })
  )
  .handleInvocation(async ctx => {
    let threads = await new CommunityClient(ctx.auth.token).request<Thread[]>(
      'GET',
      `/channels/${encodeURIComponent(ctx.input.channelId)}/threads`,
      undefined,
      { startingAfter: ctx.input.startingAfter, limit: ctx.input.limit }
    );
    return {
      output: { threads, nextStartingAfter: threads.at(-1)?.id },
      message: `Retrieved ${threads.length} channel thread(s).`
    };
  })
  .build();

export let getThread = SlateTool.create(spec, {
  key: 'get_thread',
  name: 'Get Thread',
  description:
    'Read one thread, including its comments, reactions, provider permalink, and file URL metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ threadId: z.string() }))
  .output(z.object({ thread: threadSchema }))
  .handleInvocation(async ctx => {
    let thread = await new CommunityClient(ctx.auth.token).request<Thread>(
      'GET',
      `/threads/${encodeURIComponent(ctx.input.threadId)}`
    );
    return { output: { thread }, message: 'Retrieved the requested thread.' };
  })
  .build();

export let postThread = SlateTool.create(spec, {
  key: 'post_thread',
  name: 'Post Thread',
  description:
    'Create a thread using formatted text in a channel from list_community_channels. Returns the actual thread with its provider permalink, file URLs, and metadata.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      channelId: z.string().describe('Channel ID from list_community_channels'),
      text: z
        .string()
        .describe('Formatted text; see the Heartbeat Rich Text API documentation'),
      userId: z
        .string()
        .optional()
        .describe('Admin author ID; omitted uses the API key creator'),
      embeds: z
        .array(z.string())
        .optional()
        .describe('HTML embed codes, each containing an iframe'),
      createdAt: z
        .string()
        .optional()
        .describe('Optional creation timestamp in ISO 8601 format')
    })
  )
  .output(z.object({ thread: threadSchema }))
  .handleInvocation(async ctx => {
    let { channelId, userId, ...content } = ctx.input;
    let thread = await new CommunityClient(ctx.auth.token).request<Thread>('PUT', '/threads', {
      ...content,
      channelID: channelId,
      userID: userId
    });
    return { output: { thread }, message: 'Heartbeat returned the created thread.' };
  })
  .build();

export let postComment = SlateTool.create(spec, {
  key: 'post_comment',
  name: 'Post Comment',
  description:
    'Create a thread comment or a reply to a top-level comment using formatted text. Heartbeat supports two comment levels. Returns the actual comment and provider metadata.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      threadId: z.string(),
      text: z
        .string()
        .describe('Formatted text; see the Heartbeat Rich Text API documentation'),
      parentCommentId: z
        .string()
        .nullable()
        .describe(
          'Null for a thread reply, or a top-level comment ID to reply to that comment'
        ),
      userId: z
        .string()
        .optional()
        .describe('Admin author ID; omitted uses the API key creator'),
      createdAt: z
        .string()
        .optional()
        .describe('Optional creation timestamp in ISO 8601 format')
    })
  )
  .output(z.object({ comment: commentSchema }))
  .handleInvocation(async ctx => {
    let { threadId, parentCommentId, userId, ...content } = ctx.input;
    let comment = await new CommunityClient(ctx.auth.token).request<Comment>(
      'PUT',
      '/comments',
      {
        ...content,
        threadID: threadId,
        parentCommentID: parentCommentId,
        userID: userId
      }
    );
    return { output: { comment }, message: 'Heartbeat returned the created comment.' };
  })
  .build();

export let listEvents = SlateTool.create(spec, {
  key: 'list_events',
  name: 'List Events',
  description:
    'List community events, optionally filtered by an access group from list_access_groups. Returns provider event IDs, times, invited members and groups, and metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({ groupId: z.string().optional().describe('Group ID from list_access_groups') })
  )
  .output(z.object({ events: z.array(eventSchema) }))
  .handleInvocation(async ctx => {
    let events = await new CommunityClient(ctx.auth.token).request<Event[]>(
      'GET',
      '/events',
      undefined,
      { groupID: ctx.input.groupId }
    );
    return { output: { events }, message: `Retrieved ${events.length} event(s).` };
  })
  .build();

export let getEvent = SlateTool.create(spec, {
  key: 'get_event',
  name: 'Get Event',
  description:
    'Retrieve one community event by an ID from list_events, preserving provider metadata.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ eventId: z.string().describe('Event ID from list_events') }))
  .output(z.object({ event: eventSchema }))
  .handleInvocation(async ctx => {
    let event = await new CommunityClient(ctx.auth.token).request<Event>(
      'GET',
      `/events/${encodeURIComponent(ctx.input.eventId)}`
    );
    return { output: { event }, message: 'Retrieved the requested event.' };
  })
  .build();

export let scheduleEvent = SlateTool.create(spec, {
  key: 'schedule_event',
  name: 'Schedule Event',
  description:
    'Create an event with the start time, duration, location, and optional invited emails or group IDs. Returns the actual HTTP status and provider response.',
  instructions: [
    'Heartbeat does not specify a duration unit in its public API schema. Supply a value appropriate for your established Heartbeat API workflow.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      startTime: z.string().describe('Start timestamp in ISO 8601 format'),
      duration: z
        .number()
        .describe(
          'Duration value expected by the Heartbeat API; the public schema does not specify its unit'
        ),
      location: z
        .string()
        .describe(
          'HEARTBEAT for a voice channel, ZOOM for an integrated Zoom account, or a custom location'
        ),
      invitedUsers: z.array(z.string()).optional().describe('Email addresses to invite'),
      invitedGroups: z
        .array(z.string())
        .optional()
        .describe('Group IDs from list_access_groups')
    })
  )
  .output(mutationSchema)
  .handleInvocation(async ctx => {
    let output = await new CommunityClient(ctx.auth.token).mutate('PUT', '/events', ctx.input);
    return { output, message: 'Heartbeat accepted the event creation request.' };
  })
  .build();
