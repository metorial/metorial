import { Buffer } from 'node:buffer';
import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { IterableClient } from '../lib/client';
import { iterableServiceError } from '../lib/errors';
import { requireField, requireUserIdentity } from '../lib/validation';
import { spec } from '../spec';

let exportDataTypeSchema = z.enum([
  'emailSend',
  'emailOpen',
  'emailClick',
  'hostedUnsubscribeClick',
  'emailComplaint',
  'emailBounce',
  'emailSendSkip',
  'pushSend',
  'pushOpen',
  'pushUninstall',
  'pushBounce',
  'pushSendSkip',
  'inAppSend',
  'inAppOpen',
  'inAppClick',
  'inAppClose',
  'inAppDelete',
  'inAppDelivery',
  'inAppSendSkip',
  'inAppRecall',
  'inboxSession',
  'inboxMessageImpression',
  'smsSend',
  'smsBounce',
  'smsClick',
  'smsReceived',
  'smsSendSkip',
  'webPushSend',
  'webPushClick',
  'webPushSendSkip',
  'emailSubscribe',
  'emailUnSubscribe',
  'purchase',
  'customEvent',
  'user',
  'smsUsageInfo',
  'embeddedSend',
  'embeddedSendSkip',
  'embeddedClick',
  'embeddedReceived',
  'embeddedImpression',
  'embeddedSession',
  'unknownSession',
  'journeyExit',
  'whatsAppBounce',
  'whatsAppClick',
  'whatsAppReceived',
  'whatsAppSeen',
  'whatsAppSend',
  'whatsAppSendSkip',
  'whatsAppUsageInfo'
]);

export let exportData = SlateTool.create(spec, {
  name: 'Export Data',
  key: 'export_data',
  description: `Exports Iterable project data or a specific user's events. Returned CSV or JSON stream content is provided as a Slate attachment, with structured output limited to metadata.`,
  instructions: [
    'For exportType "data", provide dataTypeName and either range or both startDateTime and endDateTime.',
    'For exportType "userEvents", provide either email or userId.'
  ],
  constraints: ['Synchronous data exports are rate-limited by Iterable to 4 requests/minute.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      exportType: z
        .enum(['data', 'userEvents'])
        .describe('Type of export: bulk data export or specific user event export'),
      format: z
        .enum(['csv', 'json'])
        .optional()
        .describe(
          'Attachment format for data exports. Defaults to csv. User event exports are JSON stream.'
        ),
      dataTypeName: exportDataTypeSchema
        .optional()
        .describe('Data type to export (required for data export)'),
      range: z
        .enum(['Today', 'Yesterday', 'BeforeToday', 'All'])
        .optional()
        .describe('Predefined UTC date range'),
      startDateTime: z
        .string()
        .optional()
        .describe('Export starting from, formatted yyyy-MM-dd HH:mm:ss [ZZ]'),
      endDateTime: z
        .string()
        .optional()
        .describe('Export ending before, formatted yyyy-MM-dd HH:mm:ss [ZZ]'),
      omitFields: z.string().optional().describe('Fields to omit, comma separated'),
      delimiter: z.string().optional().describe('CSV delimiter for csv data exports'),
      onlyFields: z.array(z.string()).optional().describe('Only export these fields'),
      campaignId: z.number().optional().describe('Filter export by campaign ID'),
      email: z.string().optional().describe('User email (for userEvents export)'),
      userId: z.string().optional().describe('User ID (for userEvents export)'),
      includeCustomEvents: z
        .boolean()
        .optional()
        .describe('Include custom events (for userEvents export)')
    })
  )
  .output(
    z.object({
      exportType: z.string().describe('Export type requested'),
      format: z.string().describe('Attachment format'),
      contentType: z.string().describe('Attachment MIME type'),
      byteLength: z.number().describe('UTF-8 byte length of the attachment content'),
      attachmentCount: z.number().describe('Number of Slate attachments returned'),
      message: z.string().describe('Result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IterableClient({
      token: ctx.auth.token,
      dataCenter: ctx.config.dataCenter
    });

    if (ctx.input.exportType === 'userEvents') {
      requireUserIdentity(ctx.input);
      let result = await client.exportUserEvents({
        email: ctx.input.email,
        userId: ctx.input.userId,
        includeCustomEvents: ctx.input.includeCustomEvents
      });
      let content = typeof result === 'string' ? result : JSON.stringify(result);
      let contentType = 'application/x-json-stream';
      return {
        output: {
          exportType: ctx.input.exportType,
          format: 'json',
          contentType,
          byteLength: Buffer.byteLength(content, 'utf8'),
          attachmentCount: 1,
          message: 'Exported user events as an attachment.'
        },
        attachments: [createTextAttachment(content, contentType)],
        message: `Exported user events for **${ctx.input.email || ctx.input.userId}** as a JSON stream attachment.`
      };
    }

    let dataTypeName = requireField(ctx.input.dataTypeName, 'dataTypeName');
    if (!ctx.input.range && (!ctx.input.startDateTime || !ctx.input.endDateTime)) {
      throw iterableServiceError(
        'Provide range or both startDateTime and endDateTime for data exports.'
      );
    }

    let format = ctx.input.format ?? 'csv';
    let result = await client.exportData({
      format,
      dataTypeName,
      range: ctx.input.range,
      startDateTime: ctx.input.startDateTime,
      endDateTime: ctx.input.endDateTime,
      delimiter: ctx.input.delimiter,
      omitFields: ctx.input.omitFields,
      onlyFields: ctx.input.onlyFields,
      campaignId: ctx.input.campaignId
    });
    let content = typeof result === 'string' ? result : JSON.stringify(result);
    let contentType = format === 'csv' ? 'text/csv' : 'application/x-json-stream';

    return {
      output: {
        exportType: ctx.input.exportType,
        format,
        contentType,
        byteLength: Buffer.byteLength(content, 'utf8'),
        attachmentCount: 1,
        message: `Exported "${dataTypeName}" as an attachment.`
      },
      attachments: [createTextAttachment(content, contentType)],
      message: `Exported **${dataTypeName}** as a **${format.toUpperCase()}** attachment.`
    };
  })
  .build();
