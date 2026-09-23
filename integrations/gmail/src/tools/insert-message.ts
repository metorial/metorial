import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type InsertedGmailMessage } from '../lib/client';
import { buildRawMessageForInsertion } from '../lib/message-insertion';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let messageContentFields = {
  raw: z
    .string()
    .min(1)
    .optional()
    .describe(
      'Complete RFC 822 message: header lines starting on the first line, a blank line, then the body. Use this or the structured fields from/to/subject/body.'
    ),
  rawEncoding: z
    .enum(['text', 'base64'])
    .optional()
    .describe(
      'Encoding of raw: text (default; the message as plain text, encoded for you) or base64 (standard or URL-safe alphabet, padding optional)'
    ),
  from: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('From header for a structured message, e.g. "Ada <ada@example.com>"'),
  to: z
    .array(z.string().trim().min(1))
    .optional()
    .describe('To recipients for a structured message'),
  cc: z
    .array(z.string().trim().min(1))
    .optional()
    .describe('Cc recipients for a structured message'),
  subject: z.string().optional().describe('Subject for a structured message'),
  body: z.string().optional().describe('Body for a structured message'),
  isHtml: z.boolean().optional().describe('Set true when body is HTML'),
  date: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe('Date header for a structured message (ISO 8601); defaults to now'),
  inReplyTo: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'In-Reply-To header for a structured message: the Message-ID of the message being replied to, e.g. "<abc123@mail.example.com>"'
    ),
  references: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'References header for a structured message: space-separated Message-IDs of earlier messages in the conversation'
    ),
  labelIds: z
    .array(z.string().trim().min(1))
    .optional()
    .describe(
      'Label IDs to apply, e.g. ["INBOX", "UNREAD"]. Without INBOX the message is stored only under its labels and All Mail.'
    ),
  threadId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      'Existing thread to add the message to. Gmail only threads it when the message also has References and In-Reply-To headers (inReplyTo and references for a structured message, or in the raw message itself) and a matching Subject'
    ),
  deleted: z
    .boolean()
    .optional()
    .describe(
      'Store the message as permanently deleted, visible only to Google Vault administrators (Google Workspace only)'
    )
};

let insertedMessageOutput = z.object({
  messageId: z.string().describe('ID of the new message in the mailbox'),
  threadId: z.string().optional().describe('Thread ID, when returned by Gmail'),
  labelIds: z.array(z.string()).describe('Labels on the new message'),
  sizeEstimate: z.number().optional().describe('Estimated message size in bytes'),
  internalDate: z
    .string()
    .optional()
    .describe('Internal date Gmail recorded, in epoch milliseconds')
});

let mapInsertedMessage = (message: InsertedGmailMessage) => ({
  messageId: message.id,
  threadId: message.threadId,
  labelIds: message.labelIds ?? [],
  sizeEstimate: message.sizeEstimate,
  internalDate: message.internalDate
});

let sharedConstraints = [
  'Only adds the message to this mailbox; nothing is sent to the recipients in the message headers.',
  'The message is sent inline in the request. Gmail recommends its media upload flow for content over 5 MB, so keep messages under 5 MB; use a mail client or migration tool for larger messages.'
];

let internalDateSourceField = (description: string) =>
  z.enum(['receivedTime', 'dateHeader']).optional().describe(description);

let contentInstructions =
  'Provide either **raw** (a full RFC 822 message) or the structured fields **from**, **to**, **subject**, and **body**; the tool builds and encodes the message.';

let threadingInstructions =
  'To add the message to an existing conversation, set **threadId** together with **inReplyTo** and **references** (or the matching In-Reply-To and References headers in raw), and keep the Subject the same as the thread.';

export let importMessage = SlateTool.create(spec, {
  name: 'Import Message',
  key: 'import_message',
  description:
    "Import an email into the user's Gmail mailbox as if it arrived by normal delivery: Gmail runs its standard scanning and classification (spam, categories, filters), like receiving over SMTP. Use this for migrating mail into Gmail. Does not send the message. Use insert_message instead to store a message exactly as given without scanning.",
  instructions: [
    contentInstructions,
    threadingInstructions,
    'Set neverMarkSpam to true to keep Gmail from classifying the message as spam.',
    "Set processForCalendar to true to add meeting invitations in the message to the user's Google Calendar.",
    'Add "INBOX" (and "UNREAD") to labelIds for the message to appear in the inbox.'
  ],
  constraints: [
    ...sharedConstraints,
    'Import does not perform SPF checks, so some spoofed messages may be handled differently than real delivery.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.importMessage)
  .input(
    z.object({
      ...messageContentFields,
      internalDateSource: internalDateSourceField(
        "Where Gmail's internal date comes from: dateHeader (default for import; the message's Date header, when valid) or receivedTime (now)"
      ),
      neverMarkSpam: z
        .boolean()
        .optional()
        .describe('Never mark this message as spam, whatever the spam classifier decides'),
      processForCalendar: z
        .boolean()
        .optional()
        .describe("Add meeting invitations found in the message to the user's Google Calendar")
    })
  )
  .output(insertedMessageOutput)
  .handleInvocation(async ctx => {
    let raw = buildRawMessageForInsertion(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });
    let message = await client.importMessage({
      raw,
      labelIds: ctx.input.labelIds,
      threadId: ctx.input.threadId,
      internalDateSource: ctx.input.internalDateSource,
      neverMarkSpam: ctx.input.neverMarkSpam,
      processForCalendar: ctx.input.processForCalendar,
      deleted: ctx.input.deleted
    });
    let output = mapInsertedMessage(message);

    return {
      output,
      message: `Imported message \`${output.messageId}\` with labels ${output.labelIds.length ? output.labelIds.join(', ') : '(none)'}.`
    };
  });

export let insertMessage = SlateTool.create(spec, {
  name: 'Insert Message',
  key: 'insert_message',
  description:
    "Insert an email directly into the user's Gmail mailbox, like IMAP APPEND, bypassing most of Gmail's scanning and classification so the message is stored exactly as given with only the labels you choose. Does not send the message. Use import_message instead when the message should be treated like normal incoming mail.",
  instructions: [
    contentInstructions,
    threadingInstructions,
    'Inserted messages get only the labels in labelIds; add "INBOX" (and "UNREAD") for the message to appear in the inbox.'
  ],
  constraints: [
    ...sharedConstraints,
    'Spam filtering, categories, and mail filters are not applied to inserted messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(gmailActionScopes.insertMessage)
  .input(
    z.object({
      ...messageContentFields,
      internalDateSource: internalDateSourceField(
        "Where Gmail's internal date comes from: receivedTime (default for insert; now) or dateHeader (the message's Date header, when valid)"
      )
    })
  )
  .output(insertedMessageOutput)
  .handleInvocation(async ctx => {
    let raw = buildRawMessageForInsertion(ctx.input);
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });
    let message = await client.insertMessage({
      raw,
      labelIds: ctx.input.labelIds,
      threadId: ctx.input.threadId,
      internalDateSource: ctx.input.internalDateSource,
      deleted: ctx.input.deleted
    });
    let output = mapInsertedMessage(message);

    return {
      output,
      message: `Inserted message \`${output.messageId}\` with labels ${output.labelIds.length ? output.labelIds.join(', ') : '(none)'}.`
    };
  });
