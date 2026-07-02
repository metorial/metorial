import { SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description: `Upload a file or image to a Knack record. This performs a two-step process: first uploads the file asset to Knack, then attaches it to a record by creating or updating the record with the asset ID. The record must have a file or image field to attach the asset to.`,
  instructions: [
    'Provide the file content as a base64-encoded string along with the file name and MIME content type.',
    'Specify whether to create a new record or update an existing one with the uploaded asset.'
  ],
  constraints: ['Only works with object-based access (API key authentication).'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      objectKey: z
        .string()
        .describe('Object key containing the file/image field (e.g., "object_1")'),
      fieldKey: z.string().describe('Field key of the file or image field (e.g., "field_5")'),
      fileName: z
        .string()
        .describe('Name of the file including extension (e.g., "report.pdf")'),
      fileContent: z.string().describe('Base64-encoded file content'),
      contentType: z
        .string()
        .describe('MIME type of the file (e.g., "application/pdf", "image/png")'),
      recordId: z
        .string()
        .optional()
        .describe(
          'Existing record ID to attach the file to. If omitted, a new record is created.'
        ),
      additionalFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional field values to set when creating/updating the record')
    })
  )
  .output(
    z.object({
      record: z.record(z.string(), z.any()).describe('The created or updated record'),
      assetId: z.string().describe('The ID of the uploaded file asset')
    })
  )
  .handleInvocation(async ctx => {
    let client = new KnackClient({
      applicationId: ctx.config.applicationId,
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });

    ctx.info(`Uploading file asset: ${ctx.input.fileName} (${ctx.input.contentType})`);

    let assetId = await client.uploadFile(
      ctx.input.objectKey,
      ctx.input.fieldKey,
      ctx.input.fileName,
      ctx.input.fileContent,
      ctx.input.contentType
    );

    ctx.info(`File uploaded with asset ID: ${assetId}, attaching to record`);

    let fields: Record<string, any> = {
      ...(ctx.input.additionalFields || {}),
      [ctx.input.fieldKey]: assetId
    };

    let record: any;
    if (ctx.input.recordId) {
      record = await client.updateObjectRecord(
        ctx.input.objectKey,
        ctx.input.recordId,
        fields
      );
    } else {
      record = await client.createObjectRecord(ctx.input.objectKey, fields);
    }

    let recordId = record.id || ctx.input.recordId || 'unknown';

    return {
      output: { record, assetId },
      message: ctx.input.recordId
        ? `Uploaded **${ctx.input.fileName}** and attached to record **${recordId}**.`
        : `Uploaded **${ctx.input.fileName}** and created new record **${recordId}**.`
    };
  })
  .build();
