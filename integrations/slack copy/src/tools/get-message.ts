import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import type { SlackMessage, SlackUser } from '../lib/types';
import { spec } from '../spec';

let reactionSchema = z.object({
  name: z.string().describe('Emoji name without surrounding colons'),
  count: z.number().describe('Number of reactions'),
  userIds: z.array(z.string()).describe('User IDs returned for this reaction')
});

let fileSchema = z.object({
  fileId: z.string().describe('Slack file ID'),
  name: z.string().optional().describe('File name'),
  title: z.string().optional().describe('File title'),
  mimeType: z.string().optional().describe('File MIME type'),
  fileType: z.string().optional().describe('Slack file type'),
  size: z.number().optional().describe('File size in bytes'),
  userId: z.string().optional().describe('User ID that uploaded the file'),
  permalink: z.string().optional().describe('Slack permalink for the file')
});

let authorSchema = z.object({
  userId: z.string().optional().describe('Slack user ID'),
  botId: z.string().optional().describe('Slack bot ID'),
  username: z.string().optional().describe('Slack username'),
  realName: z.string().optional().describe('Full name'),
  displayName: z.string().optional().describe('Display name'),
  isBot: z.boolean().optional().describe('Whether Slack identifies the user as a bot'),
  deleted: z.boolean().optional().describe('Whether the user account is deleted'),
  imageUrl: z.string().optional().describe('Profile image URL')
});

let messageSchema = z.object({
  ts: z.string().describe('Slack message timestamp'),
  text: z.string().optional().describe('Message text'),
  userId: z.string().optional().describe('User ID of the message author'),
  botId: z.string().optional().describe('Bot ID when a bot authored the message'),
  author: authorSchema.optional().describe('Hydrated author details when available'),
  threadTs: z.string().optional().describe('Parent thread timestamp'),
  replyCount: z.number().optional().describe('Number of thread replies'),
  replyUsersCount: z.number().optional().describe('Number of distinct users who replied'),
  latestReplyTs: z.string().optional().describe('Timestamp of the latest reply'),
  type: z.string().optional().describe('Slack message type'),
  subtype: z.string().optional().describe('Slack message subtype'),
  editedByUserId: z.string().optional().describe('User ID that last edited the message'),
  editedTs: z.string().optional().describe('Timestamp of the latest edit'),
  reactions: z.array(reactionSchema).optional().describe('Emoji reactions on the message'),
  files: z.array(fileSchema).optional().describe('Files attached to the message'),
  blocks: z.array(z.any()).optional().describe('Slack Block Kit content'),
  attachments: z.array(z.any()).optional().describe('Slack message attachments')
});

let mapAuthor = (message: SlackMessage, user?: SlackUser) => {
  if (!message.user && !message.bot_id) return undefined;

  return {
    userId: message.user,
    botId: message.bot_id,
    username: user?.name,
    realName: user?.real_name ?? user?.profile?.real_name,
    displayName: user?.profile?.display_name,
    isBot: user?.is_bot ?? (message.bot_id ? true : undefined),
    deleted: user?.deleted,
    imageUrl: user?.profile?.image_72 ?? user?.profile?.image_48
  };
};

let mapMessage = (message: SlackMessage, user?: SlackUser) => ({
  ts: message.ts,
  text: message.text,
  userId: message.user,
  botId: message.bot_id,
  author: mapAuthor(message, user),
  threadTs: message.thread_ts,
  replyCount: message.reply_count,
  replyUsersCount: message.reply_users_count,
  latestReplyTs: message.latest_reply,
  type: message.type,
  subtype: message.subtype,
  editedByUserId: message.edited?.user,
  editedTs: message.edited?.ts,
  reactions: message.reactions?.map(reaction => ({
    name: reaction.name,
    count: reaction.count,
    userIds: reaction.users
  })),
  files: message.files?.map(file => ({
    fileId: file.id,
    name: file.name,
    title: file.title,
    mimeType: file.mimetype,
    fileType: file.filetype,
    size: file.size,
    userId: file.user,
    permalink: file.permalink
  })),
  blocks: message.blocks,
  attachments: message.attachments
});

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieve one exact Slack channel-level message by timestamp with its permalink, full message content, hydrated author details when available, and optional bounded preceding context or thread replies.',
  instructions: [
    'Use contextLimit only when nearby preceding channel messages are needed.',
    'Use includeReplies for a bounded thread preview; use read_thread when replies need pagination.',
    'The message timestamp must identify a channel-level message or thread parent.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.conversationHistory)
  .input(
    z.object({
      channelId: z.string().min(1).describe('Slack conversation ID containing the message'),
      messageTs: z.string().min(1).describe('Exact Slack message timestamp to retrieve'),
      contextLimit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Include up to this many preceding channel messages (max 20)'),
      includeReplies: z
        .boolean()
        .optional()
        .describe('Include a bounded preview of replies when the message is a thread parent'),
      replyLimit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum replies to include when includeReplies is true (default 100)')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Slack conversation ID containing the message'),
      messageTs: z.string().describe('Exact Slack message timestamp'),
      permalink: z.string().describe('Stable Slack permalink for the message'),
      message: messageSchema.describe('Exact matching Slack message'),
      contextMessages: z
        .array(messageSchema)
        .optional()
        .describe('Requested preceding messages in chronological order'),
      replies: z
        .array(messageSchema)
        .optional()
        .describe('Requested bounded thread reply preview'),
      hasMoreReplies: z
        .boolean()
        .optional()
        .describe('Whether Slack reports more thread replies')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.replyLimit !== undefined && !ctx.input.includeReplies) {
      throw slackServiceError('replyLimit can only be used when includeReplies is true');
    }

    let client = new SlackClient(ctx.auth.token);
    let exactResult = await client.getConversationHistory({
      channel: ctx.input.channelId,
      oldest: ctx.input.messageTs,
      latest: ctx.input.messageTs,
      inclusive: true,
      limit: 1
    });
    let exactMessage = exactResult.messages.find(
      message => message.ts === ctx.input.messageTs
    );

    if (!exactMessage) {
      throw slackServiceError(
        `Slack did not return a channel-level message matching timestamp ${ctx.input.messageTs} in conversation ${ctx.input.channelId}`
      );
    }

    let contextPromise = ctx.input.contextLimit
      ? client.getConversationHistory({
          channel: ctx.input.channelId,
          latest: ctx.input.messageTs,
          inclusive: false,
          limit: ctx.input.contextLimit
        })
      : Promise.resolve(undefined);
    let repliesPromise = ctx.input.includeReplies
      ? client.getConversationReplies({
          channel: ctx.input.channelId,
          ts: ctx.input.messageTs,
          limit: (ctx.input.replyLimit ?? 100) + 1
        })
      : Promise.resolve(undefined);
    let authorPromise = exactMessage.user
      ? client.getUserInfo(exactMessage.user).catch(() => undefined)
      : Promise.resolve(undefined);

    let [permalink, context, replyResult, author] = await Promise.all([
      client.getPermalink({
        channel: ctx.input.channelId,
        messageTs: ctx.input.messageTs
      }),
      contextPromise,
      repliesPromise,
      authorPromise
    ]);
    let replyLimit = ctx.input.replyLimit ?? 100;
    let replies = replyResult?.messages
      .filter(message => message.ts !== ctx.input.messageTs)
      .slice(0, replyLimit);

    return {
      output: {
        channelId: ctx.input.channelId,
        messageTs: ctx.input.messageTs,
        permalink,
        message: mapMessage(exactMessage, author),
        contextMessages: context?.messages
          .filter(message => message.ts !== ctx.input.messageTs)
          .reverse()
          .map(message => mapMessage(message)),
        replies: replies?.map(message => mapMessage(message)),
        hasMoreReplies: replyResult === undefined ? undefined : replyResult.hasMore
      },
      message: `Retrieved Slack message \`${ctx.input.messageTs}\` from conversation \`${ctx.input.channelId}\`.`
    };
  })
  .build();
