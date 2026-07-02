import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let messageSchema = z.object({
  messageId: z.string().describe('Unique identifier of the message'),
  type: z.string().describe('Message type: SMS, Fax, VoiceMail, or Pager'),
  direction: z.string().describe('Message direction: Inbound or Outbound'),
  subject: z.string().optional().describe('Message subject or text preview'),
  from: z.string().optional().describe('Sender phone number or name'),
  to: z.array(z.string()).optional().describe('Recipient phone numbers or names'),
  readStatus: z.string().describe('Read status of the message: Read or Unread'),
  creationTime: z.string().describe('ISO 8601 timestamp when the message was created'),
  lastModifiedTime: z
    .string()
    .describe('ISO 8601 timestamp when the message was last modified')
});

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `List messages from the RingCentral message store including SMS, fax, and voicemail. Supports filtering by message type, direction, date range, and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      messageType: z
        .enum(['SMS', 'Fax', 'VoiceMail', 'Pager'])
        .optional()
        .describe('Filter by message type: SMS, Fax, VoiceMail, or Pager'),
      direction: z
        .enum(['Inbound', 'Outbound'])
        .optional()
        .describe('Filter by message direction: Inbound or Outbound'),
      dateFrom: z
        .string()
        .optional()
        .describe('Start date in ISO 8601 format to filter messages from'),
      dateTo: z
        .string()
        .optional()
        .describe('End date in ISO 8601 format to filter messages to'),
      extensionId: z
        .string()
        .optional()
        .describe('Extension ID to list messages for (defaults to current user)'),
      perPage: z.number().optional().describe('Number of messages per page'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      messages: z.array(messageSchema).describe('List of messages from the message store'),
      totalCount: z.number().describe('Total number of messages matching the filter criteria'),
      page: z.number().describe('Current page number'),
      perPage: z.number().describe('Number of messages per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.getMessageList({
      extensionId: ctx.input.extensionId,
      messageType: ctx.input.messageType,
      direction: ctx.input.direction,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let messages = (result.records || []).map((m: any) => ({
      messageId: String(m.id),
      type: m.type,
      direction: m.direction,
      subject: m.subject,
      from: m.from?.phoneNumber || m.from?.name,
      to: m.to?.map((t: any) => t.phoneNumber || t.name),
      readStatus: m.readStatus,
      creationTime: m.creationTime,
      lastModifiedTime: m.lastModifiedTime
    }));

    return {
      output: {
        messages,
        totalCount: result.paging?.totalElements ?? messages.length,
        page: result.paging?.page ?? 1,
        perPage: result.paging?.perPage ?? messages.length
      },
      message: `Listed ${messages.length} messages.`
    };
  })
  .build();
