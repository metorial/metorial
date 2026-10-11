import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
import { discordServiceError } from '../lib/errors';
import { discordActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let threadOutputSchema = z.object({
  threadId: z.string().describe('ID of the thread'),
  name: z.string().describe('Name of the thread'),
  parentChannelId: z.string().describe('ID of the parent channel the thread belongs to'),
  ownerId: z.string().describe('ID of the user who created the thread'),
  archived: z.boolean().describe('Whether the thread is archived'),
  autoArchiveDuration: z
    .number()
    .describe(
      'Duration in minutes after which the thread auto-archives (60, 1440, 4320, or 10080)'
    ),
  threadType: z
    .number()
    .describe(
      'Type of thread (10 = ANNOUNCEMENT_THREAD, 11 = PUBLIC_THREAD, 12 = PRIVATE_THREAD)'
    ),
  locked: z.boolean().optional().describe('Whether the thread is locked'),
  archiveTimestamp: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 timestamp of the last archive status change')
});

let formatThread = (thread: any) => ({
  threadId: thread.id,
  name: thread.name,
  parentChannelId: thread.parent_id || '',
  ownerId: thread.owner_id || '',
  archived: thread.thread_metadata?.archived ?? false,
  autoArchiveDuration: thread.thread_metadata?.auto_archive_duration ?? 1440,
  threadType: thread.type,
  locked: thread.thread_metadata?.locked ?? false,
  archiveTimestamp: thread.thread_metadata?.archive_timestamp ?? null
});

let autoArchiveDurationSchema = z
  .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
  .optional()
  .describe(
    'Minutes of inactivity before the thread auto-archives (60, 1440, 4320, or 10080). Defaults to 1440 when creating.'
  );

export let manageThreads = SlateTool.create(spec, {
  name: 'Manage Threads',
  key: 'manage_threads',
  description: `Manage Discord threads and forum posts: create a thread from a message, create a standalone thread or forum post, update (rename, archive, lock) a thread, add a member, or list active and archived threads.`,
  instructions: [
    'Use **create_from_message** to start a public thread attached to a message in a text or announcement channel.',
    'Use **create** to start a thread without a message. In a text channel set **threadType** (11 public, 12 private; Discord defaults to private). In a forum or media channel provide **content** for the first post; **threadType** is ignored there and **appliedTags** may set forum tags.',
    'Use **update** with **threadId** to rename, archive/unarchive, lock/unlock, or change the auto-archive duration.',
    'Use **add_member** with **threadId** and **userId** to add someone to a thread (the thread must not be archived).',
    'Use **list_active** with **guildId** for all active threads in a server, or **list_archived** with **channelId** for public archived threads of a channel (paginate with **before**).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageThreads)
  .input(
    // One object schema (no top-level oneOf); per-action requirements are checked at runtime.
    z.object({
      action: z
        .enum([
          'create_from_message',
          'create',
          'update',
          'add_member',
          'list_active',
          'list_archived'
        ])
        .describe('The thread action to perform'),
      channelId: z
        .string()
        .optional()
        .describe(
          'Parent channel ID (required for create_from_message, create, and list_archived)'
        ),
      messageId: z
        .string()
        .optional()
        .describe('Message to start the thread from (required for create_from_message)'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (required for update and add_member)'),
      guildId: z.string().optional().describe('Guild ID (required for list_active)'),
      userId: z.string().optional().describe('User to add (required for add_member)'),
      name: z
        .string()
        .optional()
        .describe(
          'Thread name, 1-100 characters (required for create actions; optional for update)'
        ),
      threadType: z
        .union([z.literal(11), z.literal(12)])
        .optional()
        .describe(
          'For create in a text channel: 11 for PUBLIC_THREAD, 12 for PRIVATE_THREAD (Discord defaults to 12)'
        ),
      content: z
        .string()
        .optional()
        .describe(
          'First message of a forum or media channel post, up to 2000 characters (create only; required for forum and media channels)'
        ),
      appliedTags: z
        .array(z.string())
        .optional()
        .describe('Forum tag IDs to apply to a forum post (create or update, max 5)'),
      autoArchiveDuration: autoArchiveDurationSchema,
      archived: z
        .boolean()
        .optional()
        .describe('Archive (true) or unarchive (false) the thread (update)'),
      locked: z
        .boolean()
        .optional()
        .describe('Lock the thread so only moderators can unarchive it (update)'),
      before: z
        .string()
        .optional()
        .describe(
          'ISO 8601 timestamp; list_archived returns threads archived before it (use the oldest archiveTimestamp from the previous page)'
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum threads to return for list_archived')
    })
  )
  .output(
    z.union([
      threadOutputSchema.describe(
        'Thread details (returned for create, update, and add_member)'
      ),
      z.object({
        threads: z.array(threadOutputSchema).describe('List of threads'),
        hasMore: z
          .boolean()
          .optional()
          .describe('Whether more archived threads exist (list_archived only)')
      })
    ])
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });
    let { action } = input;

    let required = <T>(value: T | undefined, field: string): T => {
      if (value === undefined || value === null || value === '') {
        throw discordServiceError(`${field} is required for the ${action} action`);
      }
      return value;
    };

    if (action === 'create_from_message') {
      let channelId = required(input.channelId, 'channelId');
      let messageId = required(input.messageId, 'messageId');
      let thread = await client.startThreadFromMessage(channelId, messageId, {
        name: required(input.name, 'name'),
        auto_archive_duration: input.autoArchiveDuration ?? 1440
      });

      return {
        output: formatThread(thread),
        message: `Created thread **${thread.name}** from message \`${messageId}\` in channel \`${channelId}\`.`
      };
    }

    if (action === 'create') {
      let channelId = required(input.channelId, 'channelId');
      if (input.content !== undefined && input.threadType !== undefined) {
        throw discordServiceError(
          'Use content for forum or media channel posts, or threadType for text channel threads, not both'
        );
      }
      let data: Record<string, any> = {
        name: required(input.name, 'name'),
        auto_archive_duration: input.autoArchiveDuration ?? 1440
      };
      // https://docs.discord.com/developers/resources/channel#start-thread-in-forum-or-media-channel
      if (input.content !== undefined) {
        data.message = { content: input.content, allowed_mentions: { parse: [] } };
      } else if (input.threadType !== undefined) {
        data.type = input.threadType;
      }
      if (input.appliedTags !== undefined) data.applied_tags = input.appliedTags;

      let thread = await client.startThreadWithoutMessage(channelId, data);

      return {
        output: formatThread(thread),
        message: `Created ${input.content !== undefined ? 'forum post' : 'thread'} **${thread.name}** in channel \`${channelId}\`.`
      };
    }

    if (action === 'update') {
      let threadId = required(input.threadId, 'threadId');
      let data: Record<string, any> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.archived !== undefined) data.archived = input.archived;
      if (input.locked !== undefined) data.locked = input.locked;
      if (input.autoArchiveDuration !== undefined) {
        data.auto_archive_duration = input.autoArchiveDuration;
      }
      if (input.appliedTags !== undefined) data.applied_tags = input.appliedTags;
      if (Object.keys(data).length === 0) {
        throw discordServiceError(
          'Provide name, archived, locked, autoArchiveDuration, or appliedTags to update'
        );
      }

      let thread = await client.modifyChannel(threadId, data);
      return {
        output: formatThread(thread),
        message: `Updated thread **${thread.name}** (\`${threadId}\`).`
      };
    }

    if (action === 'add_member') {
      let threadId = required(input.threadId, 'threadId');
      let userId = required(input.userId, 'userId');
      await client.addThreadMember(threadId, userId);
      let thread = await client.getChannel(threadId);
      return {
        output: formatThread(thread),
        message: `Added user \`${userId}\` to thread \`${threadId}\`.`
      };
    }

    if (action === 'list_archived') {
      let channelId = required(input.channelId, 'channelId');
      let result = await client.listPublicArchivedThreads(channelId, {
        before: input.before,
        limit: input.limit
      });
      let threads = (result.threads || []).map(formatThread);
      return {
        output: { threads, hasMore: result.has_more === true },
        message: `Found **${threads.length}** archived thread(s) in channel \`${channelId}\`.`
      };
    }

    // action === 'list_active'
    let guildId = required(input.guildId, 'guildId');
    let result = await client.listActiveThreads(guildId);
    let threads = (result.threads || []).map(formatThread);

    return {
      output: {
        threads
      },
      message: `Found **${threads.length}** active thread(s) in guild \`${guildId}\`.`
    };
  })
  .build();
