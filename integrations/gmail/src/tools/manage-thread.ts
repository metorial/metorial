import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageThread = SlateTool.create(spec, {
  name: 'Manage Thread',
  key: 'manage_thread',
  description: `Get, list, modify labels, trash, untrash, or delete email conversation threads. Retrieve full thread conversations with all messages.`,
  instructions: [
    'Use **action** "get" to retrieve a thread with all its messages.',
    'Use **action** "list" to search/list threads with an optional query.',
    'Use **action** "modify_labels" to add/remove labels on a thread (applies to all messages).',
    'Use **action** "trash", "untrash", or "delete" to manage thread lifecycle.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(gmailActionScopes.manageThread)
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'modify_labels', 'trash', 'untrash', 'delete'])
        .describe('Thread operation to perform.'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (required for get, modify_labels, trash, untrash, delete).'),
      query: z.string().optional().describe('Gmail search query (for list action).'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Filter by label IDs (for list) or labels to add (for modify_labels).'),
      addLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to add (for modify_labels).'),
      removeLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to remove (for modify_labels).'),
      maxResults: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum threads to return (for list).'),
      pageToken: z.string().optional().describe('Page token for list pagination.'),
      includeSpamTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include threads in SPAM/TRASH (for list).')
    })
  )
  .output(
    z.object({
      threadId: z.string().optional().describe('Thread ID.'),
      snippet: z.string().optional().describe('Thread snippet.'),
      historyId: z.string().optional().describe('History ID.'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Message ID.'),
            threadId: z.string().describe('Thread ID.'),
            labelIds: z.array(z.string()).describe('Labels.'),
            snippet: z.string().describe('Snippet.'),
            from: z.string().optional().describe('Sender.'),
            to: z.string().optional().describe('Recipients.'),
            subject: z.string().optional().describe('Subject.'),
            date: z.string().optional().describe('Date.'),
            bodyText: z.string().optional().describe('Plain text body.'),
            bodyHtml: z.string().optional().describe('HTML body.'),
            attachments: z.array(
              z.object({
                attachmentId: z.string(),
                filename: z.string(),
                mimeType: z.string(),
                size: z.number()
              })
            )
          })
        )
        .optional()
        .describe('Messages in the thread.'),
      threads: z
        .array(
          z.object({
            threadId: z.string().describe('Thread ID.'),
            snippet: z.string().describe('Thread snippet.'),
            historyId: z.string().describe('History ID.')
          })
        )
        .optional()
        .describe('List of threads (for list action).'),
      nextPageToken: z.string().optional().describe('Next page token (for list).'),
      resultSizeEstimate: z
        .number()
        .optional()
        .describe('Estimated total results (for list).'),
      deleted: z.boolean().optional().describe('Whether deletion was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.threadId) throw new Error('threadId is required for get action');
      let thread = await client.getThread(ctx.input.threadId);
      let messages = (thread.messages || []).map(parseMessage);

      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId,
          messages
        },
        message: `Retrieved thread with **${messages.length}** messages.`
      };
    }

    if (action === 'list') {
      let result = await client.listThreads({
        query: ctx.input.query,
        labelIds: ctx.input.labelIds,
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken,
        includeSpamTrash: ctx.input.includeSpamTrash
      });
      let threads = await Promise.all(
        result.threads.map(async thread => {
          if (typeof thread.snippet === 'string' && typeof thread.historyId === 'string') {
            return thread;
          }

          let hydrated = await client.getThread(thread.id, 'metadata');
          return {
            id: hydrated.id,
            snippet: hydrated.snippet,
            historyId: hydrated.historyId
          };
        })
      );

      return {
        output: {
          threads: threads.map(t => ({
            threadId: t.id,
            snippet: t.snippet ?? '',
            historyId: t.historyId ?? ''
          })),
          nextPageToken: result.nextPageToken,
          resultSizeEstimate: result.resultSizeEstimate
        },
        message: `Found **${result.resultSizeEstimate}** threads. Returned ${threads.length}.`
      };
    }

    if (action === 'modify_labels') {
      if (!ctx.input.threadId)
        throw new Error('threadId is required for modify_labels action');
      let thread = await client.modifyThread(
        ctx.input.threadId,
        ctx.input.addLabelIds,
        ctx.input.removeLabelIds
      );

      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Modified labels on thread **${ctx.input.threadId}**.`
      };
    }

    if (action === 'trash') {
      if (!ctx.input.threadId) throw new Error('threadId is required for trash action');
      let thread = await client.trashThread(ctx.input.threadId);
      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Thread **${ctx.input.threadId}** moved to trash.`
      };
    }

    if (action === 'untrash') {
      if (!ctx.input.threadId) throw new Error('threadId is required for untrash action');
      let thread = await client.untrashThread(ctx.input.threadId);
      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Thread **${ctx.input.threadId}** restored from trash.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.threadId) throw new Error('threadId is required for delete action');
      await client.deleteThread(ctx.input.threadId);
      return {
        output: { deleted: true },
        message: `Thread **${ctx.input.threadId}** permanently deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
