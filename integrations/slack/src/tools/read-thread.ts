import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackActionScopes } from '../lib/scopes';
import type { SlackMessage } from '../lib/types';
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

let threadMessageSchema = z.object({
  ts: z.string().describe('Slack message timestamp'),
  text: z.string().optional().describe('Message text'),
  userId: z.string().optional().describe('User ID of the message author'),
  botId: z.string().optional().describe('Bot ID when a bot authored the message'),
  threadTs: z.string().optional().describe('Parent thread timestamp'),
  replyCount: z.number().optional().describe('Number of replies reported by Slack'),
  replyUsersCount: z.number().optional().describe('Number of distinct users who replied'),
  latestReplyTs: z.string().optional().describe('Timestamp of the latest reply'),
  subtype: z.string().optional().describe('Slack message subtype'),
  editedByUserId: z.string().optional().describe('User ID that last edited the message'),
  editedTs: z.string().optional().describe('Timestamp of the latest edit'),
  reactions: z.array(reactionSchema).optional().describe('Emoji reactions on the message'),
  files: z.array(fileSchema).optional().describe('Files attached to the message'),
  blocks: z.array(z.any()).optional().describe('Slack Block Kit content')
});

let mapThreadMessage = (message: SlackMessage, detailed: boolean) => ({
  ts: message.ts,
  text: message.text,
  userId: message.user,
  botId: message.bot_id,
  threadTs: message.thread_ts,
  ...(detailed
    ? {
        replyCount: message.reply_count,
        replyUsersCount: message.reply_users_count,
        latestReplyTs: message.latest_reply,
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
        blocks: message.blocks
      }
    : {})
});

export let readThread = SlateTool.create(spec, {
  name: 'Read Thread',
  key: 'read_thread',
  description:
    'Read a known Slack thread, returning its parent message, replies, pagination state, and permalink. Use search or channel history first when the thread timestamp is unknown.',
  instructions: [
    'Use this after a search or history result to expand the full context before summarizing or replying.',
    'This tool reads an existing thread; it does not search for threads or send a reply.',
    'Use **responseFormat=concise** when message text and author IDs are sufficient.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .scopes(slackActionScopes.conversationHistory)
  .input(
    z.object({
      channelId: z.string().min(1).describe('Slack conversation ID containing the thread'),
      messageTs: z.string().min(1).describe('Timestamp of the thread parent message'),
      cursor: z.string().optional().describe('Pagination cursor for the next page'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .default(100)
        .describe('Maximum messages to return (default 100, max 1000)'),
      oldest: z.string().optional().describe('Only replies at or after this Unix timestamp'),
      latest: z.string().optional().describe('Only replies at or before this Unix timestamp'),
      responseFormat: z
        .enum(['detailed', 'concise'])
        .optional()
        .default('detailed')
        .describe('Detailed includes reactions, files, blocks, edit state, and reply metadata')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('Slack conversation ID containing the thread'),
      messageTs: z.string().describe('Timestamp of the thread parent message'),
      permalink: z.string().describe('Stable Slack URL for the thread parent'),
      parent: threadMessageSchema
        .optional()
        .describe('Thread parent when Slack includes it in this page'),
      replies: z.array(threadMessageSchema).describe('Thread replies in this page'),
      returnedReplyCount: z.number().describe('Number of replies returned in this page'),
      hasMore: z.boolean().describe('Whether Slack reports more thread messages'),
      nextCursor: z.string().optional().describe('Cursor for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlackClient(ctx.auth.token);
    let [result, permalink] = await Promise.all([
      client.getConversationReplies({
        channel: ctx.input.channelId,
        ts: ctx.input.messageTs,
        limit: ctx.input.limit,
        cursor: ctx.input.cursor,
        oldest: ctx.input.oldest,
        latest: ctx.input.latest,
        inclusive: ctx.input.oldest !== undefined || ctx.input.latest !== undefined
      }),
      client.getPermalink({
        channel: ctx.input.channelId,
        messageTs: ctx.input.messageTs
      })
    ]);
    let detailed = ctx.input.responseFormat === 'detailed';
    let parent = result.messages.find(message => message.ts === ctx.input.messageTs);
    let replies = result.messages.filter(message => message.ts !== ctx.input.messageTs);

    return {
      output: {
        channelId: ctx.input.channelId,
        messageTs: ctx.input.messageTs,
        permalink,
        parent: parent ? mapThreadMessage(parent, detailed) : undefined,
        replies: replies.map(message => mapThreadMessage(message, detailed)),
        returnedReplyCount: replies.length,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor
      },
      message: `Retrieved ${replies.length} repl${replies.length === 1 ? 'y' : 'ies'} from Slack thread \`${ctx.input.messageTs}\`.`
    };
  })
  .build();
