import { SlateTool } from 'slates';
import { z } from 'zod';
import { DromoClient } from '../lib/client';
import { createDownloadAttachment } from '../lib/files';
import { spec } from '../spec';

export let getUpload = SlateTool.create(spec, {
  name: 'Get Upload',
  key: 'get_upload',
  description: `Retrieves detailed metadata for a specific upload, including filename, user info, timestamps, row count, and a download URL for the imported data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      uploadId: z.string().describe('ID of the upload to retrieve')
    })
  )
  .output(
    z.object({
      uploadId: z.string().describe('Unique identifier of the upload'),
      filename: z.string().describe('Original filename of the uploaded file'),
      userName: z.string().describe('Name of the user who performed the import'),
      userEmail: z.string().describe('Email of the user who performed the import'),
      createdDate: z.string().describe('ISO-8601 timestamp of when the import was created'),
      importType: z.string().optional().describe('Type of import when supplied by Dromo'),
      status: z.string().describe('Current status of the upload'),
      numDataRows: z.number().describe('Number of data rows in the upload'),
      developmentMode: z
        .boolean()
        .optional()
        .describe('Whether the import was done in development mode, when supplied by Dromo'),
      hasData: z.boolean().describe('Whether data is available for retrieval'),
      fieldOrder: z.array(z.string()).describe('Ordered list of field keys'),
      downloadUrl: z.string().optional().describe('Pre-signed URL to download the data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DromoClient({ token: ctx.auth.token });
    let meta = await client.getUploadMetadata(ctx.input.uploadId);
    let filename = meta.raw_upload?.filename ?? meta.filename ?? '';
    let status = meta.upload_status ?? meta.status;
    let numDataRows = meta.total_num_rows ?? meta.num_data_rows ?? 0;
    let hasData = meta.has_data ?? (status === 'PROCESSED' && Boolean(meta.storage_key));

    let downloadUrl: string | undefined;
    if (hasData) {
      let urlResponse = await client.getUploadDownloadUrl(ctx.input.uploadId);
      downloadUrl = urlResponse.url;
      await ctx.addAttachment(
        createDownloadAttachment(downloadUrl, 'upload', ctx.input.uploadId)
      );
    }

    return {
      output: {
        uploadId: meta.id,
        filename,
        userName: meta.user?.name ?? '',
        userEmail: meta.user?.email ?? '',
        createdDate: meta.created_date,
        importType: meta.import_type,
        status,
        numDataRows,
        developmentMode: meta.development_mode,
        hasData,
        fieldOrder: meta.field_order,
        downloadUrl
      },
      message: `Retrieved upload **${filename || meta.id}** with ${numDataRows} rows (status: ${status}).`
    };
  })
  .build();
