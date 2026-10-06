import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ } from '../auth';
import { Client, parseMessage } from '../lib/client';
import {
  buildReplyHeaders,
  defaultReplySubject,
  defaultReplyTo,
  pickReplyTarget,
  sortMessagesChronological
} from '../lib/reply-context';
import { spec } from '../spec';

export let getConversationContext = SlateTool.create(spec, {
  name: 'Get Conversation Context',
  key: 'get_conversation_context',
  description:
    'Load a full **thread** with parsed messages (headers, bodies, attachment metadata) plus **reply hints** (In-Reply-To, References, suggested recipients and subject) for the message you are replying to.',
  instructions: [
    'Call after **search_conversations** when you need bodies and headers to decide triage or compose a reply.',
    'The minimal format has no headers or body and omits replyHints. Use full or metadata when reply headers are needed.',
    'Use **replyHints** with **manage_reply_draft** or **send_reply** so replies stay properly threaded.',
    'Pass **replyToMessageId** to reply to a specific message in the thread; otherwise hints target the chronologically latest message.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf(GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ))
  .input(
    z.object({
      threadId: z.string().describe('Gmail thread ID.'),
      replyToMessageId: z
        .string()
        .optional()
        .describe(
          'Message ID to build reply headers for; defaults to the latest message in the thread.'
        ),
      format: z
        .enum(['full', 'metadata', 'minimal'])
        .optional()
        .default('full')
        .describe('Gmail API format for each message (`full` includes body parts).')
    })
  )
  .output(
    z.object({
      threadId: z.string(),
      snippet: z.string().optional(),
      historyId: z.string().optional(),
      labelIdsAggregate: z
        .array(z.string())
        .describe('Union of label IDs seen on messages in this thread.'),
      messages: z.array(
        z.object({
          messageId: z.string(),
          threadId: z.string(),
          labelIds: z.array(z.string()),
          snippet: z.string().optional(),
          internalDate: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          cc: z.string().optional(),
          subject: z.string().optional(),
          date: z.string().optional(),
          mimeMessageId: z.string().optional(),
          bodyText: z.string().optional(),
          bodyHtml: z.string().optional(),
          attachments: z.array(
            z.object({
              attachmentId: z.string().optional(),
              partId: z.string().optional(),
              filename: z.string(),
              mimeType: z.string().optional(),
              size: z.number().optional()
            })
          )
        })
      ),
      replyHints: z
        .object({
          replyToMessageId: z.string(),
          inReplyTo: z.string(),
          references: z.string(),
          suggestedTo: z.array(z.string()),
          suggestedSubject: z.string()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let thread = await client.getThread(ctx.input.threadId, ctx.input.format);
    let rawMessages = thread.messages || [];
    let parsed = rawMessages.map(parseMessage);
    let sortedParsed = sortMessagesChronological(parsed);

    let labelSet = new Set<string>();
    for (let m of parsed) {
      for (let id of m.labelIds) {
        labelSet.add(id);
      }
    }

    const candidates = rawMessages.filter(message => !message.labelIds?.includes('DRAFT'));
    const targetRaw =
      ctx.input.replyToMessageId || candidates.length
        ? pickReplyTarget(rawMessages, ctx.input.replyToMessageId)
        : undefined;
    const targetParsed = targetRaw ? parseMessage(targetRaw) : undefined;
    let headers: ReturnType<typeof buildReplyHeaders> | undefined;
    if (targetRaw && targetParsed?.mimeMessageId) {
      try {
        headers = buildReplyHeaders(targetRaw);
      } catch {
        /* A readable message can have invalid RFC reply headers; omit optional hints. */
      }
    }
    const mailboxEmail = headers ? (await client.getProfile()).emailAddress : undefined;
    const replyHints =
      targetRaw && targetParsed && headers
        ? {
            replyToMessageId: targetRaw.id,
            ...headers,
            suggestedTo: defaultReplyTo(targetParsed, mailboxEmail),
            suggestedSubject: defaultReplySubject(targetParsed.subject)
          }
        : undefined;

    return {
      output: {
        threadId: thread.id,
        snippet: thread.snippet,
        historyId: thread.historyId,
        labelIdsAggregate: [...labelSet],
        messages: sortedParsed.map(m => ({
          messageId: m.messageId,
          threadId: m.threadId,
          labelIds: m.labelIds,
          snippet: m.snippet,
          internalDate: m.internalDate,
          from: m.from,
          to: m.to,
          cc: m.cc,
          subject: m.subject,
          date: m.date,
          mimeMessageId: m.mimeMessageId,
          bodyText: m.bodyText,
          bodyHtml: m.bodyHtml,
          attachments: m.attachments
        })),
        replyHints
      },
      message: `Loaded **${sortedParsed.length}** messages in the requested format${replyHints ? ' with reply hints' : ' without reply hints'}.`
    };
  });
