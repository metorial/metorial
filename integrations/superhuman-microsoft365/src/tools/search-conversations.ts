import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let conversationSummarySchema = z.object({
  conversationId: z.string(),
  messageCountInSample: z.number(),
  latestSubject: z.string().optional(),
  latestPreview: z.string().optional(),
  latestReceivedDateTime: z.string().optional(),
  unreadInSample: z.number(),
  fromAddress: z.string().optional(),
  fromName: z.string().optional(),
  hasAttachmentsInSample: z.boolean()
});

export let searchConversations = SlateTool.create(spec, {
  name: 'Search Conversations',
  key: 'search_conversations',
  description:
    'Search the mailbox and return **conversation-centric** results: messages are grouped by `conversationId` so you can triage threads, not isolated messages. Uses the same Graph list/search semantics as listing messages, then aggregates the latest activity per thread.',
  instructions: [
    'Results are derived from the **most recent messages scanned** (see **scanLimit**), not the entire mailbox—raise **scanLimit** when you need broader coverage.',
    'Use **search** for keyword search (subject/body/addresses) or **filter** for OData (e.g. `isRead eq false`).',
    'Well-known **folderId** values include `inbox`, `drafts`, `sentitems`, `archive`, and `deleteditems`.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.string().optional().describe('Mail folder ID or well-known folder name'),
      search: z.string().optional().describe('Graph $search query (keyword search)'),
      filter: z.string().optional().describe('OData $filter expression'),
      orderby: z
        .string()
        .optional()
        .describe('OData $orderby for underlying messages (default: receivedDateTime desc)'),
      scanLimit: z
        .number()
        .optional()
        .describe('Max messages to fetch before grouping (default 80, max 200)')
    })
  )
  .output(
    z.object({
      conversations: z.array(conversationSummarySchema),
      messagesScanned: z.number(),
      nextPageAvailable: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let scanLimit = Math.min(ctx.input.scanLimit ?? 80, 200);

    let result = await client.listMessages({
      folderId: ctx.input.folderId,
      search: ctx.input.search,
      filter: ctx.input.filter,
      orderby: ctx.input.orderby ?? 'receivedDateTime desc',
      top: scanLimit,
      select: [
        'id',
        'conversationId',
        'subject',
        'bodyPreview',
        'receivedDateTime',
        'isRead',
        'from',
        'hasAttachments'
      ]
    });

    let byConversation = new Map<
      string,
      {
        latest: (typeof result.value)[0];
        count: number;
        unread: number;
        hasAttach: boolean;
      }
    >();

    for (let msg of result.value) {
      let cid = msg.conversationId;
      if (!cid) {
        continue;
      }
      let existing = byConversation.get(cid);
      if (!existing) {
        byConversation.set(cid, {
          latest: msg,
          count: 1,
          unread: msg.isRead === false ? 1 : 0,
          hasAttach: !!msg.hasAttachments
        });
      } else {
        existing.count += 1;
        if (msg.isRead === false) {
          existing.unread += 1;
        }
        if (msg.hasAttachments) {
          existing.hasAttach = true;
        }
        let tNew = msg.receivedDateTime ? Date.parse(msg.receivedDateTime) : 0;
        let tOld = existing.latest.receivedDateTime
          ? Date.parse(existing.latest.receivedDateTime)
          : 0;
        if (tNew >= tOld) {
          existing.latest = msg;
        }
      }
    }

    let conversations = [...byConversation.values()].map(row => ({
      conversationId: row.latest.conversationId!,
      messageCountInSample: row.count,
      latestSubject: row.latest.subject,
      latestPreview: row.latest.bodyPreview,
      latestReceivedDateTime: row.latest.receivedDateTime,
      unreadInSample: row.unread,
      fromAddress: row.latest.from?.emailAddress?.address,
      fromName: row.latest.from?.emailAddress?.name,
      hasAttachmentsInSample: row.hasAttach
    }));

    conversations.sort((a, b) => {
      let ta = a.latestReceivedDateTime ? Date.parse(a.latestReceivedDateTime) : 0;
      let tb = b.latestReceivedDateTime ? Date.parse(b.latestReceivedDateTime) : 0;
      return tb - ta;
    });

    return {
      output: {
        conversations,
        messagesScanned: result.value.length,
        nextPageAvailable: !!result['@odata.nextLink']
      },
      message: `Grouped **${conversations.length}** conversation(s) from **${result.value.length}** message(s).`
    };
  })
  .build();
