import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let exportRecord = SlateTool.create(spec, {
  name: 'Export Record',
  key: 'export_record',
  description: `Export a single record from a Ragic sheet in various formats: HTML, PDF, Excel, Mail Merge, or Custom Print Report. Returns the download URL for the exported file.`,
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
      contentType: z.string().describe('MIME type of the exported file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

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
        if (ctx.input.mailMergeTemplateId) {
          exportParams.cid = ctx.input.mailMergeTemplateId;
        }
        break;
      case 'customPrint':
        format = 'carbone';
        if (ctx.input.customPrintTemplateId) {
          exportParams.ragicCustomPrintTemplateId = ctx.input.customPrintTemplateId;
        }
        exportParams.fileFormat = ctx.input.customPrintFileFormat || 'pdf';
        break;
      default:
        format = 'pdf';
    }

    let serverDomain = ctx.config.serverDomain;
    let accountName = ctx.config.accountName;
    let recordUrl = `https://${serverDomain}/${accountName}/${ctx.input.tabFolder}/${ctx.input.sheetIndex}/${ctx.input.recordId}.${format}`;

    let paramStr = Object.entries(exportParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    if (paramStr) {
      recordUrl += `?${paramStr}`;
    }

    let result = await client.exportRecord(sheet, ctx.input.recordId, format, exportParams);

    return {
      output: {
        exportUrl: recordUrl,
        contentType: result.contentType
      },
      message: `Exported record **${ctx.input.recordId}** as **${ctx.input.format}** from sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**. [Download](${recordUrl})`
    };
  })
  .build();
