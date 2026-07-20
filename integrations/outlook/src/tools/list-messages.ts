import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Emails',
  key: 'list_messages',
  description: `List email messages from the authenticated user's mailbox. Supports filtering by folder, searching by keyword, ordering, and pagination. Use OData filter syntax for advanced filtering (e.g., \`isRead eq false\`). Returns message previews with metadata.`,
  instructions: [
    'Use the **folderId** to list messages from a specific folder (e.g., Inbox, Drafts, SentItems).',
    'Use well-known folder names like "inbox", "drafts", "sentitems", "deleteditems" as folderId.',
    'The **search** parameter performs a full-text search across subject, body, and addresses.',
    "Use **filter** for OData queries like `importance eq 'high'` or `hasAttachments eq true`."
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z
        .string()
        .optional()
        .describe('Mail folder ID or well-known name (e.g., "inbox", "drafts", "sentitems")'),
      search: z.string().optional().describe('Full-text search query'),
      filter: z.string().optional().describe('OData filter expression'),
      orderby: z
        .string()
        .optional()
        .describe(
          'OData orderby expression (e.g., "receivedDateTime desc"). Ignored when search is provided because Microsoft Graph controls search-result ordering.'
        ),
      top: z
        .number()
        .optional()
        .describe('Maximum number of messages to return (default 10, max 1000)'),
      skip: z.number().optional().describe('Number of messages to skip for pagination')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string(),
          subject: z.string().optional(),
          bodyPreview: z.string().optional(),
          fromAddress: z.string().optional(),
          fromName: z.string().optional(),
          toRecipients: z
            .array(
              z.object({
                address: z.string(),
                name: z.string().optional()
              })
            )
            .optional(),
          receivedDateTime: z.string().optional(),
          isRead: z.boolean().optional(),
          isDraft: z.boolean().optional(),
          importance: z.string().optional(),
          hasAttachments: z.boolean().optional(),
          conversationId: z.string().optional(),
          webLink: z.string().optional(),
          categories: z.array(z.string()).optional()
        })
      ),
      nextPageAvailable: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listMessages({
      folderId: ctx.input.folderId,
      search: ctx.input.search,
      filter: ctx.input.filter,
      orderby: ctx.input.search ? undefined : ctx.input.orderby || 'receivedDateTime desc',
      top: ctx.input.top || 10,
      skip: ctx.input.skip,
      select: [
        'id',
        'subject',
        'bodyPreview',
        'from',
        'toRecipients',
        'receivedDateTime',
        'isRead',
        'isDraft',
        'importance',
        'hasAttachments',
        'conversationId',
        'webLink',
        'categories'
      ]
    });

    let messages = result.value.map(msg => ({
      messageId: msg.id,
      subject: msg.subject,
      bodyPreview: msg.bodyPreview,
      fromAddress: msg.from?.emailAddress?.address,
      fromName: msg.from?.emailAddress?.name,
      toRecipients: msg.toRecipients?.map(r => ({
        address: r.emailAddress.address,
        name: r.emailAddress.name
      })),
      receivedDateTime: msg.receivedDateTime,
      isRead: msg.isRead,
      isDraft: msg.isDraft,
      importance: msg.importance,
      hasAttachments: msg.hasAttachments,
      conversationId: msg.conversationId,
      webLink: msg.webLink,
      categories: msg.categories
    }));

    return {
      output: {
        messages,
        nextPageAvailable: !!result['@odata.nextLink']
      },
      message: `Found **${messages.length}** email(s).${result['@odata.nextLink'] ? ' More results available.' : ''}`
    };
  })
  .build();
