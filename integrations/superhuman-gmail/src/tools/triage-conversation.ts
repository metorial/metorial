import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let triageAction = z.enum([
  'archive',
  'unarchive',
  'mark_read',
  'mark_unread',
  'star',
  'unstar',
  'apply_labels',
  'remove_labels',
  'trash',
  'restore',
  'delete'
]);

export let triageConversation = SlateTool.create(spec, {
  name: 'Triage Conversation',
  key: 'triage_conversation',
  description:
    'Apply a single high-level **triage** action to an entire Gmail **thread**: archive/unarchive, read/unread, star/unstar, add/remove labels, move to trash, restore from trash, or permanently delete.',
  instructions: [
    '**archive** removes INBOX; **unarchive** adds INBOX.',
    '**mark_read** removes UNREAD; **mark_unread** adds UNREAD.',
    '**star** / **unstar** use the STARRED system label.',
    'For **apply_labels** / **remove_labels**, pass **labelIds** (custom label IDs or system IDs).',
    '**delete** permanently removes the thread (requires full mail scope); prefer **trash** for reversible triage.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Thread to triage.'),
      action: triageAction.describe('Triage operation to perform on the whole thread.'),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs for apply_labels / remove_labels.')
    })
  )
  .output(
    z.object({
      threadId: z.string().optional(),
      snippet: z.string().optional(),
      historyId: z.string().optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { threadId, action } = ctx.input;

    if (action === 'apply_labels' || action === 'remove_labels') {
      let ids = ctx.input.labelIds;
      if (!ids || ids.length === 0) {
        throw new Error('labelIds is required for apply_labels and remove_labels.');
      }
    }

    if (action === 'archive') {
      let thread = await client.modifyThread(threadId, undefined, ['INBOX']);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Archived thread **${threadId}** (removed from INBOX).`
      };
    }

    if (action === 'unarchive') {
      let thread = await client.modifyThread(threadId, ['INBOX'], undefined);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Moved thread **${threadId}** back to INBOX.`
      };
    }

    if (action === 'mark_read') {
      let thread = await client.modifyThread(threadId, undefined, ['UNREAD']);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Marked thread **${threadId}** as read.`
      };
    }

    if (action === 'mark_unread') {
      let thread = await client.modifyThread(threadId, ['UNREAD'], undefined);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Marked thread **${threadId}** as unread.`
      };
    }

    if (action === 'star') {
      let thread = await client.modifyThread(threadId, ['STARRED'], undefined);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Starred thread **${threadId}**.`
      };
    }

    if (action === 'unstar') {
      let thread = await client.modifyThread(threadId, undefined, ['STARRED']);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Removed star from thread **${threadId}**.`
      };
    }

    if (action === 'apply_labels') {
      let thread = await client.modifyThread(threadId, ctx.input.labelIds, undefined);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Applied **${ctx.input.labelIds!.length}** label(s) to thread **${threadId}**.`
      };
    }

    if (action === 'remove_labels') {
      let thread = await client.modifyThread(threadId, undefined, ctx.input.labelIds);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Removed **${ctx.input.labelIds!.length}** label(s) from thread **${threadId}**.`
      };
    }

    if (action === 'trash') {
      let thread = await client.trashThread(threadId);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Moved thread **${threadId}** to Trash.`
      };
    }

    if (action === 'restore') {
      let thread = await client.untrashThread(threadId);
      return {
        output: { threadId: thread.id, snippet: thread.snippet, historyId: thread.historyId },
        message: `Restored thread **${threadId}** from Trash.`
      };
    }

    if (action === 'delete') {
      await client.deleteThread(threadId);
      return {
        output: { deleted: true },
        message: `Permanently deleted thread **${threadId}**.`
      };
    }

    throw new Error(`Unsupported action: ${String(action)}`);
  });
