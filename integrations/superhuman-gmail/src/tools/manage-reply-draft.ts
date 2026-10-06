import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GMAIL_COMPOSE, GMAIL_FULL, GMAIL_MODIFY, GMAIL_READ } from '../auth';
import { Client, parseMessage, requireIdentifier } from '../lib/client';
import { encodeBase64Url, replaceRawHeaders, validateComposeInput } from '../lib/mime';
import {
  assertReplySubject,
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
    'Update preserves omitted recipients, reply headers and the original MIME body. An explicit body change preserves files; unsupported complex MIME must be edited in Gmail.',
    '**send** sends the draft via Gmail immediately; **delete** discards it.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .scopes(anyOf(GMAIL_FULL, GMAIL_MODIFY, GMAIL_COMPOSE, GMAIL_READ))
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
      nextPageToken: z.string().optional(),
      resultSizeEstimate: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    const { action } = ctx.input;
    if (action === 'create' || action === 'update') validateComposeInput(ctx.input);
    if (
      action !== 'get' &&
      action !== 'list' &&
      ctx.auth.grantedScopes &&
      !ctx.auth.grantedScopes.some(scope =>
        [GMAIL_FULL, GMAIL_MODIFY, GMAIL_COMPOSE].includes(scope)
      )
    )
      throw createApiServiceError(
        'This operation changes the mailbox. Reconnect with Google OAuth or Full Access.'
      );
    const client = new Client({ token: ctx.auth.token, userId: ctx.config.userId });
    const draftResult = (draft: Awaited<ReturnType<Client['getDraft']>>) => ({
      output: {
        draftId: draft.id,
        messageId: draft.message.id,
        threadId: draft.message.threadId
      },
      message: 'Saved the Gmail reply draft.'
    });
    if (action === 'create') {
      const threadId = requireIdentifier(ctx.input.threadId, 'threadId');
      const thread = await client.getThread(threadId);
      const target = pickReplyTarget(thread.messages ?? [], ctx.input.replyToMessageId);
      const parsed = parseMessage(target);
      const built =
        ctx.input.inReplyTo && ctx.input.references ? undefined : buildReplyHeaders(target);
      const profile = await client.getProfile();
      const to = ctx.input.to ?? defaultReplyTo(parsed, profile.emailAddress);
      if (!to.length)
        throw createApiServiceError('Could not infer recipients; provide to explicitly.');
      const subject = ctx.input.subject ?? defaultReplySubject(parsed.subject);
      assertReplySubject(subject, parsed.subject);
      const draft = await client.createDraft({
        from: profile.emailAddress,
        to,
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        subject,
        body: ctx.input.body ?? '',
        isHtml: ctx.input.isHtml,
        threadId,
        inReplyTo: ctx.input.inReplyTo ?? built?.inReplyTo,
        references: ctx.input.references ?? built?.references
      });
      if (draft.message.threadId !== threadId)
        throw createApiServiceError(
          'Gmail saved the draft in a different conversation. Inspect the saved draft before retrying.'
        );
      return draftResult(draft);
    }
    if (action === 'update') {
      const draftId = requireIdentifier(ctx.input.draftId, 'draftId');
      const existing = await client.getDraft(draftId);
      const parsed = parseMessage(existing.message);
      const threadId = ctx.input.threadId ?? existing.message.threadId;
      let inReplyTo = ctx.input.inReplyTo ?? parsed.inReplyTo;
      let references = ctx.input.references ?? parsed.references;
      let subject = ctx.input.subject ?? parsed.subject ?? '';
      const resolveParent =
        !!ctx.input.replyToMessageId ||
        threadId !== existing.message.threadId ||
        !inReplyTo ||
        !references ||
        ctx.input.subject !== undefined;
      if (resolveParent) {
        const thread = await client.getThread(threadId);
        const messages = (thread.messages ?? []).filter(
          message => message.id !== existing.message.id
        );
        const originalParent = messages.find(
          message => parseMessage(message).mimeMessageId === parsed.inReplyTo
        );
        const target = pickReplyTarget(
          messages,
          ctx.input.replyToMessageId ??
            (threadId === existing.message.threadId ? originalParent?.id : undefined)
        );
        const changedParent =
          !!ctx.input.replyToMessageId || threadId !== existing.message.threadId;
        const needsDerivedHeaders = changedParent
          ? !ctx.input.inReplyTo || !ctx.input.references
          : !inReplyTo || !references;
        const built = needsDerivedHeaders ? buildReplyHeaders(target) : undefined;
        if (ctx.input.replyToMessageId || threadId !== existing.message.threadId) {
          inReplyTo = ctx.input.inReplyTo ?? built?.inReplyTo;
          references = ctx.input.references ?? built?.references;
          if (threadId !== existing.message.threadId)
            subject = ctx.input.subject ?? defaultReplySubject(parseMessage(target).subject);
        } else {
          inReplyTo ??= built?.inReplyTo;
          references ??= built?.references;
        }
        assertReplySubject(subject, parseMessage(target).subject);
      }
      const to = ctx.input.to ?? (parsed.to ? [parsed.to] : []);
      if (!to.length)
        throw createApiServiceError('The draft has no recipients. Provide to explicitly.');
      let draft: Awaited<ReturnType<Client['getDraft']>>;
      if (ctx.input.body === undefined) {
        const raw = await client.getDraft(draftId, 'raw');
        if (raw.message.id !== existing.message.id || raw.message.raw === undefined)
          throw createApiServiceError(
            'The draft changed during this read, or its MIME content is unavailable. Read it again before editing.'
          );
        const replacements: Record<string, string | undefined> = {};
        for (const key of ['to', 'cc', 'bcc'] as const)
          if (ctx.input[key] !== undefined)
            replacements[key] = ctx.input[key]?.length
              ? ctx.input[key]?.join(', ')
              : undefined;
        if (ctx.input.subject !== undefined || threadId !== existing.message.threadId)
          replacements.subject = subject;
        if (inReplyTo !== parsed.inReplyTo) replacements['in-reply-to'] = inReplyTo;
        if (references !== parsed.references) replacements.references = references;
        draft = await client.updateDraftRaw(
          draftId,
          threadId,
          encodeBase64Url(replaceRawHeaders(raw.message.raw, replacements))
        );
      } else {
        if (!existing.message.payload)
          throw createApiServiceError(
            'The existing draft MIME structure is unavailable. Read it again before editing.'
          );
        draft = await client.updateDraft(draftId, {
          from: parsed.from,
          to,
          cc: ctx.input.cc ?? (parsed.cc ? [parsed.cc] : undefined),
          bcc: ctx.input.bcc ?? (parsed.bcc ? [parsed.bcc] : undefined),
          subject,
          body: ctx.input.body,
          isHtml: ctx.input.isHtml,
          threadId,
          inReplyTo,
          references,
          attachments: await client.draftFiles(existing.message)
        });
      }
      if (draft.message.threadId !== threadId)
        throw createApiServiceError(
          'Gmail saved the draft in a different conversation. Inspect the saved draft before retrying.'
        );
      return draftResult(draft);
    }
    if (action === 'list') {
      const result = await client.listDrafts(ctx.input);
      return {
        output: {
          drafts: result.drafts.map(draft => ({
            draftId: draft.id,
            messageId: draft.message.id,
            threadId: draft.message.threadId
          })),
          nextPageToken: result.nextPageToken,
          resultSizeEstimate: result.resultSizeEstimate
        },
        message: `Returned ${result.drafts.length} Gmail drafts.`
      };
    }
    const draftId = requireIdentifier(ctx.input.draftId, 'draftId');
    if (action === 'get') {
      const draft = await client.getDraft(draftId);
      const parsed = parseMessage(draft.message);
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
        message: 'Retrieved the Gmail draft.'
      };
    }
    if (action === 'send') {
      const sent = await client.sendDraft(draftId);
      const parsed = parseMessage(sent);
      return {
        output: {
          messageId: sent.id,
          threadId: sent.threadId,
          subject: parsed.subject,
          from: parsed.from,
          to: parsed.to
        },
        message: 'Gmail accepted the draft for sending. Do not retry automatically.'
      };
    }
    await client.deleteDraft(draftId);
    return { output: { draftId }, message: 'Deleted the Gmail draft.' };
  });
