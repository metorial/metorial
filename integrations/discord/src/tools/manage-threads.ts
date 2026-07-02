import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { DiscordClient } from '../lib/client';
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
  threadType: z.number().describe('Type of thread (11 = PUBLIC_THREAD, 12 = PRIVATE_THREAD)')
});

let formatThread = (thread: any) => ({
  threadId: thread.id,
  name: thread.name,
  parentChannelId: thread.parent_id || '',
  ownerId: thread.owner_id || '',
  archived: thread.thread_metadata?.archived ?? false,
  autoArchiveDuration: thread.thread_metadata?.auto_archive_duration ?? 1440,
  threadType: thread.type
});

export let manageThreads = SlateTool.create(spec, {
  name: 'Manage Threads',
  key: 'manage_threads',
  description: `Manage Discord threads: create a thread from an existing message, create a standalone thread in a channel, or list all active threads in a guild.`,
  instructions: [
    'Use **create_from_message** to start a discussion thread attached to a specific message.',
    'Use **create** to start a new thread in a channel without linking to an existing message. You must specify a **threadType**: 11 for public threads, 12 for private threads.',
    'Use **list_active** to retrieve all active (non-archived) threads in a guild.',
    '**autoArchiveDuration** controls when the thread auto-archives after inactivity. Valid values are 60 (1 hour), 1440 (1 day), 4320 (3 days), or 10080 (7 days).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(discordActionScopes.manageThreads)
  .input(
    z.discriminatedUnion('action', [
      z.object({
        action: z.literal('create_from_message'),
        channelId: z.string().describe('ID of the channel containing the message'),
        messageId: z.string().describe('ID of the message to create the thread from'),
        name: z.string().describe('Name of the thread (1-100 characters)'),
        autoArchiveDuration: z
          .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
          .optional()
          .describe(
            'Duration in minutes to auto-archive after inactivity (60, 1440, 4320, or 10080). Defaults to 1440.'
          )
      }),
      z.object({
        action: z.literal('create'),
        channelId: z.string().describe('ID of the channel to create the thread in'),
        name: z.string().describe('Name of the thread (1-100 characters)'),
        threadType: z
          .union([z.literal(11), z.literal(12)])
          .describe('Type of thread to create: 11 for PUBLIC_THREAD, 12 for PRIVATE_THREAD'),
        autoArchiveDuration: z
          .union([z.literal(60), z.literal(1440), z.literal(4320), z.literal(10080)])
          .optional()
          .describe(
            'Duration in minutes to auto-archive after inactivity (60, 1440, 4320, or 10080). Defaults to 1440.'
          )
      }),
      z.object({
        action: z.literal('list_active'),
        guildId: z.string().describe('ID of the guild to list active threads for')
      })
    ])
  )
  .output(
    z.union([
      threadOutputSchema.describe('Thread details (returned for create actions)'),
      z.object({
        threads: z.array(threadOutputSchema).describe('List of active threads in the guild')
      })
    ])
  )
  .handleInvocation(async ctx => {
    let input = ctx.input as any;
    let client = new DiscordClient({ token: ctx.auth.token, tokenType: ctx.auth.tokenType });

    if (input.action === 'create_from_message') {
      let thread = await client.startThreadFromMessage(input.channelId, input.messageId, {
        name: input.name,
        auto_archive_duration: input.autoArchiveDuration ?? 1440
      });

      return {
        output: formatThread(thread),
        message: `Created thread **${thread.name}** from message \`${input.messageId}\` in channel \`${input.channelId}\`.`
      };
    }

    if (input.action === 'create') {
      let thread = await client.startThreadWithoutMessage(input.channelId, {
        name: input.name,
        auto_archive_duration: input.autoArchiveDuration ?? 1440,
        type: input.threadType
      });

      let threadTypeLabel = input.threadType === 11 ? 'public' : 'private';

      return {
        output: formatThread(thread),
        message: `Created ${threadTypeLabel} thread **${thread.name}** in channel \`${input.channelId}\`.`
      };
    }

    // action === 'list_active'
    let result = await client.listActiveThreads(input.guildId);
    let threads = (result.threads || []).map(formatThread);

    return {
      output: {
        threads
      },
      message: `Found **${threads.length}** active thread(s) in guild \`${input.guildId}\`.`
    };
  })
  .build();
