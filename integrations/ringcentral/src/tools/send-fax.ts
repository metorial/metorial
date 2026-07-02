import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendFax = SlateTool.create(spec, {
  name: 'Send Fax',
  key: 'send_fax',
  description: `Send a fax to one or more recipients via RingCentral. Supports custom resolution, cover page text, and a file attachment encoded as base64.`,
  instructions: [
    'Provide at least one phone number in **recipientNumbers** in E.164 format (e.g., "+15551234567").',
    'To include a document, provide both **attachmentContentType** (e.g., "application/pdf") and **attachmentBase64** with the raw base64-encoded file content.',
    'The optional **coverPageText** appears on the fax cover page sent to recipients.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      recipientNumbers: z
        .array(z.string())
        .describe('List of recipient phone numbers in E.164 format.'),
      resolution: z
        .enum(['High', 'Low'])
        .optional()
        .describe(
          'Fax resolution. "High" for detailed documents, "Low" for faster transmission.'
        ),
      coverPageText: z.string().optional().describe('Text to display on the fax cover page.'),
      attachmentContentType: z
        .string()
        .optional()
        .describe('MIME type of the attachment (e.g., "application/pdf", "image/tiff").'),
      attachmentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded content of the file to fax.')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier of the fax message.'),
      messageStatus: z.string().describe('Current delivery status of the fax.'),
      creationTime: z.string().describe('ISO 8601 timestamp when the fax was created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });

    let result = await client.sendFax(
      ctx.input.recipientNumbers,
      ctx.input.resolution,
      ctx.input.coverPageText,
      ctx.input.attachmentContentType,
      ctx.input.attachmentBase64
    );

    return {
      output: {
        messageId: String(result.id),
        messageStatus: result.messageStatus || result.status || 'Queued',
        creationTime: result.creationTime || new Date().toISOString()
      },
      message: `Fax sent to **${ctx.input.recipientNumbers.join(', ')}**.`
    };
  })
  .build();
