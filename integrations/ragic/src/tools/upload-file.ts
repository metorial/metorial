import { createApiServiceError, createAxios, getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, readCreatedRecordId } from '../lib/client';
import { spec } from '../spec';

export let uploadFile = SlateTool.create(spec, {
  name: 'Upload File',
  key: 'upload_file',
  description:
    'Upload a file or image from an accessible HTTPS URL into a Ragic file/image field. Provide recordId to update an existing record; omit it to create a record containing the file.',
  instructions: [
    'Use get_sheet_schema to discover file/image field IDs if you have account manager permissions, or copy the field ID from Ragic design mode.'
  ],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      recordId: z
        .number()
        .optional()
        .describe('Existing record ID to update; omit to create a new record'),
      fieldId: z.string().describe('Field ID of the target file or image field'),
      fileUrl: z.string().describe('Accessible HTTPS URL of the file to upload'),
      fileName: z.string().describe('File name to store in Ragic, including its extension')
    })
  )
  .output(
    z.object({
      recordId: z
        .string()
        .optional()
        .describe('Record ID returned by Ragic or supplied for an update'),
      response: z.record(z.string(), z.any()).describe('Complete response returned by Ragic')
    })
  )
  .handleInvocation(async ctx => {
    let url: URL;
    try {
      url = new URL(ctx.input.fileUrl);
    } catch {
      throw createApiServiceError('fileUrl must be a valid HTTPS URL.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw createApiServiceError('fileUrl must use HTTPS without embedded credentials.');
    if (!ctx.input.fileName.trim() || /[/\\]/.test(ctx.input.fileName))
      throw createApiServiceError('Provide a file name without folder separators.');
    let source: { status: number; data: ArrayBuffer; headers: Record<string, any> };
    try {
      source = await createAxios({
        timeout: 60000,
        validateStatus: () => true
      }).get<ArrayBuffer>(url.toString(), { responseType: 'arraybuffer' });
    } catch {
      throw createApiServiceError(
        'The source file could not be downloaded. Check fileUrl and try again.'
      );
    }
    if (source.status < 200 || source.status >= 300)
      throw createApiServiceError(
        `The source file could not be downloaded (HTTP ${source.status}).`
      );
    let response = await createClient(ctx.auth, ctx.config).uploadFile(
      ctx.input,
      ctx.input.fieldId,
      ctx.input.fileName,
      source.data,
      getResponseHeaderValue(source.headers, 'content-type'),
      ctx.input.recordId
    );
    let recordId =
      ctx.input.recordId === undefined
        ? readCreatedRecordId(response)
        : String(ctx.input.recordId);
    return {
      output: { ...(recordId === undefined ? {} : { recordId }), response },
      message: `Uploaded **${ctx.input.fileName}** to Ragic.`
    };
  })
  .build();
