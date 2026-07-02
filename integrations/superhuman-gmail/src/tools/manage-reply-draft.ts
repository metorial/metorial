import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import {
  buildReplyHeaders,
  defaultReplySubject,
  defaultReplyTo,
  pickReplyTarget
} from '../lib/reply-context';
import { spec } from '../spec';

export let manageReplyDraft = SlateTool.create(spec, {
  name: 'Manage Reply Draft',
  key: 'manage_reply_draft',
  description:
    'Create, update, fetch, list, send, or delete **reply drafts** tied to a **thread**, with correct **In-Reply-To** and **References** headers when **replyToMessageId** (or the latest thread message) is used.',
  instructions: [
    'For **create**, pass **threadId**, **body**, and optionally **replyToMessageId**; **to** / **subject** default from the message you reply to.',
    'Reuse **inReplyTo** and **references** from **get_conversation_context** if you already fetched them.',
    '**send** sends the draft via Gmail immediately; **delete** discards it.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'send', 'get', 'list', 'delete'])
        .describe('Draft operation.'),
      draftId: z.string().optional().describe('Draft ID (update, send, get, delete).'),
      threadId: z
        .string()
        .optional()
        .describe('Thread ID (create, update). Required for create.'),
      replyToMessageId: z
        .string()
        .optional()
        .describe(
          'Message being replied to; defaults to latest in thread when resolving headers.'
        ),
      inReplyTo: z
        .string()
        .optional()
        .describe('Override In-Reply-To header (Message-ID of parent).'),
      references: z.string().optional().describe('Override References header chain.'),
      to: z
        .array(z.string())
        .optional()
        .describe('Recipients; defaults from Reply-To/From of target message.'),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      subject: z
        .string()
        .optional()
        .describe('Subject line; defaults to Re: … from target message.'),
      body: z.string().optional().describe('Plain text or HTML body (create/update).'),
      isHtml: z.boolean().optional().default(false),
      query: z.string().optional().describe('Filter when listing drafts.'),
      maxResults: z.number().optional().default(20),
      pageToken: z.string().optional()
    })
  )
  .output(
    z.object({
      draftId: z.string().optional(),
      messageId: z.string().optional(),
      threadId: z.string().optional(),
      subject: z.string().optional(),
      from: z.string().optional(),
      to: z.string().optional(),
      snippet: z.string().optional(),
      drafts: z
        .array(
          z.object({
            draftId: z.string(),
            messageId: z.string(),
            threadId: z.string()
          })
        )
        .optional(),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.threadId) {
        throw new Error('threadId is required for create.');
      }
      let thread = await client.getThread(ctx.input.threadId, 'full');
      let rawMessages = thread.messages || [];
      let targetRaw = pickReplyTarget(rawMessages, ctx.input.replyToMessageId);
      let targetParsed = parseMessage(targetRaw);

      let { inReplyTo, references } =
        ctx.input.inReplyTo && ctx.input.references
          ? { inReplyTo: ctx.input.inReplyTo, references: ctx.input.references }
          : buildReplyHeaders(targetRaw);

      let to =
        ctx.input.to && ctx.input.to.length > 0 ? ctx.input.to : defaultReplyTo(targetParsed);
      if (to.length === 0) {
        throw new Error('Could not infer recipients; provide **to** explicitly.');
      }

      let subject = ctx.input.subject ?? defaultReplySubject(targetParsed.subject);
      let body = ctx.input.body ?? '';

      let draft = await client.createDraft({
        to,
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        subject,
        body,
        isHtml: ctx.input.isHtml,
        threadId: ctx.input.threadId,
        inReplyTo,
        references
      });

      return {
        output: {
          draftId: draft.id,
          messageId: draft.message.id,
          threadId: draft.message.threadId
        },
        message: `Created reply draft **${draft.id}** in thread **${draft.message.threadId}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required for update.');
      }

      let existing = await client.getDraft(ctx.input.draftId, 'full');
      let parsed = parseMessage(existing.message);
      let threadId = ctx.input.threadId ?? existing.message.threadId;

      let inReplyTo = ctx.input.inReplyTo;
      let references = ctx.input.references;
      if (!inReplyTo || !references) {
        let thread = await client.getThread(threadId, 'full');
        let rawMessages = thread.messages || [];
        let targetRaw = pickReplyTarget(rawMessages, ctx.input.replyToMessageId);
        let built = buildReplyHeaders(targetRaw);
        inReplyTo = inReplyTo ?? built.inReplyTo;
        references = references ?? built.references;
      }

      let to =
        ctx.input.to && ctx.input.to.length > 0 ? ctx.input.to : parsed.to ? [parsed.to] : [];
      if (to.length === 0) {
        throw new Error('Could not infer recipients for update; provide **to**.');
      }

      let subject = ctx.input.subject ?? parsed.subject ?? '';
      let body = ctx.input.body ?? parsed.bodyText ?? parsed.bodyHtml ?? '';

      let draft = await client.updateDraft(ctx.input.draftId, {
        to,
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        subject,
        body,
        isHtml: ctx.input.isHtml,
        threadId,
        inReplyTo,
        references
      });

      return {
        output: {
          draftId: draft.id,
          messageId: draft.message.id,
          threadId: draft.message.threadId
        },
        message: `Updated draft **${ctx.input.draftId}**.`
      };
    }

    if (action === 'send') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required for send.');
      }
      let message = await client.sendDraft(ctx.input.draftId);
      let parsed = parseMessage(message);
      return {
        output: {
          messageId: message.id,
          threadId: message.threadId,
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to
        },
        message: `Sent draft **${ctx.input.draftId}** as message **${message.id}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required for get.');
      }
      let draft = await client.getDraft(ctx.input.draftId, 'full');
      let parsed = parseMessage(draft.message);
      return {
        output: {
          draftId: draft.id,
          messageId: draft.message.id,
          threadId: draft.message.threadId,
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to,
          snippet: parsed.snippet
        },
        message: `Retrieved draft **${ctx.input.draftId}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listDrafts({
        maxResults: ctx.input.maxResults,
        pageToken: ctx.input.pageToken,
        query: ctx.input.query
      });
      return {
        output: {
          drafts: result.drafts.map(d => ({
            draftId: d.id,
            messageId: d.message.id,
            threadId: d.message.threadId
          })),
          nextPageToken: result.nextPageToken
        },
        message: `Listed **${result.drafts.length}** draft(s).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.draftId) {
        throw new Error('draftId is required for delete.');
      }
      await client.deleteDraft(ctx.input.draftId);
      return {
        output: { draftId: ctx.input.draftId },
        message: `Deleted draft **${ctx.input.draftId}**.`
      };
    }

    throw new Error(`Unsupported action: ${action}`);
  });
