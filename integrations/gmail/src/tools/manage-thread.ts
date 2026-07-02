import { badRequestError, ServiceError } from '@lowerdeck/error';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let gmailServiceError = (message: string) => new ServiceError(badRequestError({ message }));

export let manageThread = SlateTool.create(spec, {
  name: 'Manage Thread',
  key: 'manage_thread',
  description: `Get, list, modify labels, trash, or restore email conversation threads. Retrieve full thread conversations with all messages.`,
  instructions: [
    'Use **action** "get" to retrieve a thread with all its messages.',
    'Use **action** "list" to search/list threads with an optional query.',
    'Use **action** "modify_labels" to add/remove labels on a thread (applies to all messages).',
    'Use **action** "trash" or "untrash" to manage thread trash state.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(gmailActionScopes.manageThread)
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'modify_labels', 'trash', 'untrash'])
        .describe('Thread operation to perform.'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (required for get, modify_labels, trash, untrash).'),
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
      resultSizeEstimate: z.number().optional().describe('Estimated total results (for list).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;
    let requireThreadId = (actionName: string) => {
      if (!ctx.input.threadId) {
        throw gmailServiceError(`threadId is required for ${actionName} action`);
      }
      return ctx.input.threadId;
    };

    if (action === 'get') {
      let threadId = requireThreadId('get');
      let thread = await client.getThread(threadId);
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
      let threadId = requireThreadId('modify_labels');
      let thread = await client.modifyThread(
        threadId,
        ctx.input.addLabelIds,
        ctx.input.removeLabelIds
      );

      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Modified labels on thread **${threadId}**.`
      };
    }

    if (action === 'trash') {
      let threadId = requireThreadId('trash');
      let thread = await client.trashThread(threadId);
      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Thread **${threadId}** moved to trash.`
      };
    }

    if (action === 'untrash') {
      let threadId = requireThreadId('untrash');
      let thread = await client.untrashThread(threadId);
      return {
        output: {
          threadId: thread.id,
          snippet: thread.snippet,
          historyId: thread.historyId
        },
        message: `Thread **${threadId}** restored from trash.`
      };
    }

    throw gmailServiceError(`Unknown action: ${action}`);
  });
