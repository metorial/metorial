import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageDraft = SlateTool.create(spec, {
  name: 'Manage Draft',
  key: 'manage_draft',
  description: `Create, update, send, list, get, or delete email drafts. Drafts can be composed with recipients, subject, body, and then sent when ready.`,
  instructions: [
    'Use **action** "create" to compose a new draft. Provide recipients, subject, and body.',
    'Use **action** "update" to modify an existing draft. Requires **draftId** and updated message fields.',
    'Use **action** "send" to send an existing draft immediately. Requires **draftId**.',
    'Use **action** "get" to retrieve a single draft by **draftId**.',
    'Use **action** "list" to list drafts in the mailbox.',
    'Use **action** "delete" to permanently delete a draft.'
  ],
  tags: {
    readOnly: false
  }
})
  .scopes(gmailActionScopes.manageDraft)
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'send', 'get', 'list', 'delete'])
        .describe('The draft operation to perform.'),
      draftId: z
        .string()
        .optional()
        .describe('Draft ID (required for update, send, get, delete).'),
      to: z.array(z.string()).optional().describe('Recipients (for create/update).'),
      cc: z.array(z.string()).optional().describe('CC recipients (for create/update).'),
      bcc: z.array(z.string()).optional().describe('BCC recipients (for create/update).'),
      subject: z.string().optional().describe('Email subject (for create/update).'),
      body: z.string().optional().describe('Email body (for create/update).'),
      isHtml: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether body is HTML (for create/update).'),
      threadId: z.string().optional().describe('Thread ID to associate this draft with.'),
      query: z.string().optional().describe('Search query for listing drafts.'),
      maxResults: z.number().optional().default(20).describe('Max drafts to list.'),
      pageToken: z.string().optional().describe('Page token for list pagination.')
    })
  )
  .output(
    z.object({
      draftId: z.string().optional().describe('Draft ID (for create, update, get, send).'),
      messageId: z.string().optional().describe('Message ID (for get, send).'),
      threadId: z.string().optional().describe('Thread ID (for get, send).'),
      subject: z.string().optional().describe('Subject of the draft/message.'),
      from: z.string().optional().describe('Sender.'),
      to: z.string().optional().describe('Recipients.'),
      snippet: z.string().optional().describe('Message snippet.'),
      drafts: z
        .array(
          z.object({
            draftId: z.string().describe('Draft ID.'),
            messageId: z.string().describe('Associated message ID.'),
            threadId: z.string().describe('Thread ID.')
          })
        )
        .optional()
        .describe('List of drafts (for list action).'),
      nextPageToken: z.string().optional().describe('Next page token (for list action).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let draft = await client.createDraft({
        to: ctx.input.to || [],
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        subject: ctx.input.subject || '',
        body: ctx.input.body || '',
        isHtml: ctx.input.isHtml,
        threadId: ctx.input.threadId
      });

      return {
        output: {
          draftId: draft.id,
          messageId: draft.message.id,
          threadId: draft.message.threadId
        },
        message: `Draft created with subject "${ctx.input.subject || '(no subject)'}".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.draftId) throw new Error('draftId is required for update action');

      let draft = await client.updateDraft(ctx.input.draftId, {
        to: ctx.input.to || [],
        cc: ctx.input.cc,
        bcc: ctx.input.bcc,
        subject: ctx.input.subject || '',
        body: ctx.input.body || '',
        isHtml: ctx.input.isHtml,
        threadId: ctx.input.threadId
      });

      return {
        output: {
          draftId: draft.id,
          messageId: draft.message.id,
          threadId: draft.message.threadId
        },
        message: `Draft **${ctx.input.draftId}** updated.`
      };
    }

    if (action === 'send') {
      if (!ctx.input.draftId) throw new Error('draftId is required for send action');

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
        message: `Draft sent as message **${message.id}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.draftId) throw new Error('draftId is required for get action');

      let draft = await client.getDraft(ctx.input.draftId);
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
        message: `Retrieved draft "${parsed.subject || '(no subject)'}".`
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
        message: `Found **${result.drafts.length}** drafts.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.draftId) throw new Error('draftId is required for delete action');

      await client.deleteDraft(ctx.input.draftId);

      return {
        output: {
          draftId: ctx.input.draftId
        },
        message: `Draft **${ctx.input.draftId}** permanently deleted.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  });
