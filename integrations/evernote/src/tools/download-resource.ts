import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let downloadResourceTool = SlateTool.create(spec, {
  name: 'Download Resource',
  key: 'download_resource',
  description: `Download the binary contents of an Evernote note resource. File bytes are returned as a Slate attachment, while the structured output contains only resource metadata.`,
  instructions: [
    'Use Get Note to discover resource GUIDs for a note.',
    'The downloaded file contents are returned in response attachments, not inline output fields.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceGuid: z.string().describe('GUID of the Evernote resource to download'),
      fallbackMimeType: z
        .string()
        .optional()
        .describe('MIME type to use if Evernote does not return one')
    })
  )
  .output(
    z.object({
      resourceGuid: z.string().describe('GUID of the downloaded resource'),
      mimeType: z.string().describe('MIME type of the downloaded resource'),
      fileName: z.string().optional().describe('Original file name, if available'),
      sizeBytes: z.number().describe('Number of downloaded bytes'),
      attachmentCount: z.number().describe('Number of file attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    let [resource, data] = await Promise.all([
      client.getResource(ctx.input.resourceGuid, false, false, false),
      client.getResourceData(ctx.input.resourceGuid)
    ]);
    let mimeType = resource.mime || ctx.input.fallbackMimeType || 'application/octet-stream';
    let fileName = resource.attributes?.fileName;
    let contentBase64 = Buffer.from(data).toString('base64');

    return {
      output: {
        resourceGuid: ctx.input.resourceGuid,
        mimeType,
        fileName,
        sizeBytes: data.length,
        attachmentCount: 1
      },
      attachments: [createBase64Attachment(contentBase64, mimeType)],
      message: `Downloaded resource \`${ctx.input.resourceGuid}\`${fileName ? ` (${fileName})` : ''}.`
    };
  })
  .build();
