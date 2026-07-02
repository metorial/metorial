import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, parseMessage } from '../lib/client';
import { gmailActionScopes } from '../scopes';
import { spec } from '../spec';

let messageOutputSchema = z.object({
  messageId: z.string().describe('Unique message ID.'),
  threadId: z.string().describe('Thread ID this message belongs to.'),
  labelIds: z.array(z.string()).describe('Labels applied to this message.'),
  snippet: z.string().describe('Short snippet preview of the message.'),
  from: z.string().optional().describe('Sender email address.'),
  to: z.string().optional().describe('Recipient email addresses.'),
  cc: z.string().optional().describe('CC recipients.'),
  subject: z.string().optional().describe('Email subject line.'),
  date: z.string().optional().describe('Date the message was sent.'),
  bodyText: z.string().optional().describe('Plain text body of the message.'),
  bodyHtml: z.string().optional().describe('HTML body of the message.'),
  attachments: z
    .array(
      z.object({
        attachmentId: z.string().describe('Attachment ID for downloading.'),
        filename: z.string().describe('Attachment file name.'),
        mimeType: z.string().describe('MIME type of the attachment.'),
        size: z.number().describe('Size in bytes.')
      })
    )
    .describe('List of attachments.')
});

export let searchMessages = SlateTool.create(spec, {
  name: 'Search Messages',
  key: 'search_messages',
  description: `Search and list email messages using Gmail query syntax. Returns parsed messages with headers, body, and attachment metadata.
Use the same search operators available in the Gmail search bar: \`from:\`, \`to:\`, \`subject:\`, \`has:attachment\`, \`after:\`, \`before:\`, \`is:unread\`, \`label:\`, etc.`,
  instructions: [
    'Use **query** for advanced searches (e.g., `from:alice@example.com subject:invoice after:2024/01/01`).',
    'Use **labelIds** to filter by label (e.g., INBOX, SENT, STARRED).',
    'Set **maxResults** to control pagination (default 20, max 500).'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(gmailActionScopes.searchMessages)
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe(
          'Gmail search query using standard operators (from:, to:, subject:, has:attachment, etc.).'
        ),
      labelIds: z
        .array(z.string())
        .optional()
        .describe('Filter by label IDs (e.g., INBOX, SENT, STARRED, UNREAD).'),
      maxResults: z
        .number()
        .optional()
        .default(20)
        .describe('Maximum number of messages to return (1-500).'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token for fetching the next page of results.'),
      includeSpamTrash: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include messages from SPAM and TRASH.')
    })
  )
  .output(
    z.object({
      messages: z.array(messageOutputSchema).describe('List of matching messages.'),
      nextPageToken: z.string().optional().describe('Token for fetching the next page.'),
      resultSizeEstimate: z.number().describe('Estimated total number of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      userId: ctx.config.userId
    });

    let listResult = await client.listMessages({
      query: ctx.input.query,
      labelIds: ctx.input.labelIds,
      maxResults: ctx.input.maxResults,
      pageToken: ctx.input.pageToken,
      includeSpamTrash: ctx.input.includeSpamTrash
    });

    let messages = await Promise.all(
      listResult.messages.map(async msg => {
        let full = await client.getMessage(msg.id);
        return parseMessage(full);
      })
    );

    return {
      output: {
        messages,
        nextPageToken: listResult.nextPageToken,
        resultSizeEstimate: listResult.resultSizeEstimate
      },
      message: `Found **${listResult.resultSizeEstimate}** messages${ctx.input.query ? ` matching "${ctx.input.query}"` : ''}. Returned ${messages.length} messages.`
    };
  });
