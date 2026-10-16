import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

const mediaFields = {
  original: 'mediaOriginal',
  excel: 'mediaExcel',
  json: 'mediaJson',
  xml: 'mediaXml',
  txt: 'mediaTxt',
  csv: 'mediaCsv'
} as const;

export let downloadDocument = SlateTool.create(spec, {
  name: 'Download Document',
  key: 'download_document',
  description:
    'Downloads the original document or its Excel, JSON, XML, TXT, or CSV extraction output using download links returned by AlgoDocs.',
  instructions: [
    'Processing is asynchronous. If a download is not ready, retrieve the extracted data again later.',
    'Split documents can produce several records. Provide recordId to download a single record or omit it for all available records.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z
        .string()
        .describe('Document ID returned by upload_document or get_extracted_data'),
      format: z
        .enum(['original', 'excel', 'json', 'xml', 'txt', 'csv'])
        .optional()
        .describe('File format to download; defaults to original'),
      recordId: z
        .string()
        .optional()
        .describe('Optional record ID from get_extracted_data for a split document')
    })
  )
  .output(
    z.object({
      documentId: z.string(),
      files: z.array(
        z.object({
          recordId: z.string(),
          fileName: z.string().describe('Original document name returned by AlgoDocs'),
          format: z.enum(['original', 'excel', 'json', 'xml', 'txt', 'csv']),
          downloadUrl: z.string().describe('Actual provider download URL')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let records = await new Client(ctx.auth).getExtractedDataByDocument(ctx.input.documentId);
    let format = ctx.input.format ?? 'original';
    let selected = records.filter(
      record => ctx.input.recordId === undefined || String(record.id) === ctx.input.recordId
    );
    if (!selected.length) {
      throw createApiServiceError(
        'No matching extraction records are available. Check the document and record IDs or try again after processing.'
      );
    }
    let files: Array<{
      recordId: string;
      fileName: string;
      format: typeof format;
      downloadUrl: string;
    }> = [];
    let seen = new Set<string>();
    for (let record of selected) {
      let downloadUrl = record[mediaFields[format]];
      if (typeof downloadUrl !== 'string' || !downloadUrl) continue;
      let parsed = z.url().safeParse(downloadUrl);
      if (!parsed.success)
        throw createApiServiceError('AlgoDocs returned an invalid download URL.');
      let url = new URL(parsed.data);
      if (
        url.origin !== 'https://api.algodocs.com' ||
        !url.pathname.startsWith('/v1/media/') ||
        url.username ||
        url.password
      ) {
        throw createApiServiceError('AlgoDocs returned an unsupported download location.');
      }
      files.push({
        recordId: String(record.id),
        fileName: record.fileName,
        format,
        downloadUrl
      });
      if (!seen.has(downloadUrl)) {
        await ctx.addAttachment({
          type: 'url',
          url: downloadUrl,
          headers: { 'x-api-key': ctx.auth.token }
        });
        seen.add(downloadUrl);
      }
    }
    if (!files.length) {
      throw createApiServiceError(
        'The requested file format is not available yet. Try again after the document finishes processing.'
      );
    }
    return {
      output: { documentId: ctx.input.documentId, files },
      message: `Prepared ${files.length} ${format} file result(s) for download.`
    };
  })
  .build();
