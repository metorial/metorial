import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let exportRecord = SlateTool.create(spec, {
  name: 'Export Record',
  key: 'export_record',
  description: `Export a single record from a Ragic sheet in various formats: HTML, PDF, Excel, Mail Merge, or Custom Print Report. Prepares a downloadable file and returns its provider URL.`,
  instructions: [
    'For **Mail Merge**, provide the `mailMergeTemplateId` (the template/cid number).',
    'For **Custom Print Report**, provide both `customPrintTemplateId` and optionally `customPrintFileFormat` (defaults to pdf).'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      recordId: z.number().describe('The ID of the record to export'),
      format: z
        .enum(['html', 'pdf', 'xlsx', 'mailMerge', 'customPrint'])
        .describe('Export format'),
      mailMergeTemplateId: z
        .string()
        .optional()
        .describe('Template ID for Mail Merge export (required when format is "mailMerge")'),
      customPrintTemplateId: z
        .string()
        .optional()
        .describe(
          'Template ID for Custom Print Report (required when format is "customPrint")'
        ),
      customPrintFileFormat: z
        .string()
        .optional()
        .default('pdf')
        .describe('Output format for Custom Print Report (e.g., pdf, png, docx)')
    })
  )
  .output(
    z.object({
      exportUrl: z.string().describe('URL to download the exported file'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type returned by Ragic for the exported file')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);

    let sheet = {
      tabFolder: ctx.input.tabFolder,
      sheetIndex: ctx.input.sheetIndex
    };

    let format: string;
    let exportParams: Record<string, string> = {};

    switch (ctx.input.format) {
      case 'html':
        format = 'xhtml';
        break;
      case 'pdf':
        format = 'pdf';
        break;
      case 'xlsx':
        format = 'xlsx';
        break;
      case 'mailMerge':
        format = 'custom';
        if (!ctx.input.mailMergeTemplateId?.trim())
          throw createApiServiceError(
            'mailMergeTemplateId is required for a Mail Merge export.'
          );
        exportParams.cid = ctx.input.mailMergeTemplateId;
        break;
      case 'customPrint':
        format = 'carbone';
        if (!ctx.input.customPrintTemplateId?.trim())
          throw createApiServiceError(
            'customPrintTemplateId is required for a Custom Print Report.'
          );
        if (!['pdf', 'png', 'docx'].includes(ctx.input.customPrintFileFormat ?? 'pdf'))
          throw createApiServiceError(
            'Custom Print Report file format must be pdf, png, or docx.'
          );
        exportParams.ragicCustomPrintTemplateId = ctx.input.customPrintTemplateId;
        exportParams.fileFormat = ctx.input.customPrintFileFormat || 'pdf';
        break;
      default:
        format = 'pdf';
    }

    let recordUrl = client.getExportUrl(sheet, ctx.input.recordId, format, exportParams);
    let result = await client.exportRecord(sheet, ctx.input.recordId, format, exportParams);
    await ctx.addAttachment({
      type: 'url',
      url: recordUrl,
      ...client.getDownloadAuth(),
      ...(result.contentType === undefined ? {} : { mimeType: result.contentType })
    });

    return {
      output: {
        exportUrl: recordUrl,
        ...(result.contentType === undefined ? {} : { contentType: result.contentType })
      },
      message: `Exported record **${ctx.input.recordId}** as **${ctx.input.format}** from sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**. The file is ready to download.`
    };
  })
  .build();
