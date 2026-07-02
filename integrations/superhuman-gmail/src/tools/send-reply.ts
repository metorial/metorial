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

export let sendReply = SlateTool.create(spec, {
  name: 'Send Reply',
  key: 'send_reply',
  description:
    'Send a **reply** in an existing **thread** with proper **In-Reply-To** and **References** so it appears in the conversation. Recipients and subject default from the message you reply to.',
  instructions: [
    'Always pass **threadId** and **replyToMessageId** (or rely on the latest message when you omit it after loading the thread).',
    'Prefer **get_conversation_context** first if you need bodies; you can copy **replyHints** into this tool.',
    'Set **isHtml** when **body** contains HTML.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Thread to reply in.'),
      replyToMessageId: z
        .string()
        .optional()
        .describe('Parent message ID; defaults to the latest message in the thread.'),
      body: z.string().describe('Reply body (plain text or HTML).'),
      isHtml: z.boolean().optional().default(false),
      to: z
        .array(z.string())
        .optional()
        .describe('Recipients; defaults from Reply-To/From of the parent message.'),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
      subject: z.string().optional().describe('Subject; defaults to Re: … from the parent.'),
      inReplyTo: z.string().optional().describe('Override In-Reply-To (Message-ID).'),
      references: z.string().optional().describe('Override References header.')
    })
  )
  .output(
    z.object({
      messageId: z.string(),
      threadId: z.string(),
      labelIds: z.array(z.string())
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

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

    let sent = await client.sendMessage({
      to,
      cc: ctx.input.cc,
      bcc: ctx.input.bcc,
      subject,
      body: ctx.input.body,
      isHtml: ctx.input.isHtml,
      threadId: ctx.input.threadId,
      inReplyTo,
      references
    });

    return {
      output: {
        messageId: sent.id,
        threadId: sent.threadId,
        labelIds: sent.labelIds || []
      },
      message: `Sent reply in thread **${sent.threadId}** as message **${sent.id}**.`
    };
  });
