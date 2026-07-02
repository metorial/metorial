import {
  fileColumnDownloadInputSchema,
  fileColumnUploadInputSchema
} from '@slates/microsoft-dataverse-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../lib/client';
import { spec } from '../spec';

export let downloadFileColumn = SlateTool.create(spec, {
  name: 'Download File or Image Column',
  key: 'download_file_column',
  description:
    'Download the binary value from a Dataverse file or image column. The file content is returned as a Slate attachment; output contains metadata only.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(fileColumnDownloadInputSchema)
  .output(
    z.object({
      entitySetName: z.string().describe('OData entity set name'),
      recordId: z.string().describe('Record GUID'),
      columnName: z.string().describe('File or image column logical name'),
      fileName: z.string().optional().describe('Attachment file name when known'),
      mimeType: z.string().optional().describe('Attachment MIME type when known'),
      sizeBytes: z.number().describe('Decoded file size in bytes'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let file = await client.downloadFileColumn(ctx.input);

    return {
      output: {
        entitySetName: ctx.input.entitySetName,
        recordId: ctx.input.recordId,
        columnName: ctx.input.columnName,
        ...file.metadata
      },
      attachments: [file.attachment],
      message: `Downloaded file column **${ctx.input.columnName}** from **${ctx.input.entitySetName}**.`
    };
  })
  .build();

export let uploadFileColumn = SlateTool.create(spec, {
  name: 'Upload File or Image Column',
  key: 'upload_file_column',
  description:
    'Upload base64 file content into a Dataverse file or image column using Dataverse block upload actions.',
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(fileColumnUploadInputSchema)
  .output(
    z.object({
      entityLogicalName: z.string().describe('Table logical name'),
      recordId: z.string().describe('Record GUID'),
      columnName: z.string().describe('File or image column logical name'),
      fileName: z.string().describe('Uploaded file name'),
      mimeType: z.string().optional().describe('Uploaded MIME type'),
      sizeBytes: z.number().describe('Decoded file size in bytes'),
      blockCount: z.number().describe('Number of uploaded Dataverse blocks'),
      result: z.any().optional().describe('Raw Dataverse commit response when returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);
    let upload = await client.uploadFileColumn(ctx.input);

    return {
      output: {
        entityLogicalName: ctx.input.entityLogicalName,
        recordId: ctx.input.recordId,
        columnName: ctx.input.columnName,
        ...upload.metadata,
        result: upload.result
      },
      message: `Uploaded **${ctx.input.fileName}** to **${ctx.input.entityLogicalName}.${ctx.input.columnName}**.`
    };
  })
  .build();
