import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { MetabaseClient } from '../lib/client';
import { spec } from '../spec';

let mimeTypes = {
  csv: 'text/csv',
  json: 'application/json',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
} as const;

export let exportQuestionResults = SlateTool.create(spec, {
  name: 'Export Question Results',
  key: 'export_question_results',
  description:
    'Run a saved question and return its complete CSV, JSON, or XLSX result as a downloadable file.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      cardId: z.number().int().positive().describe('ID of the saved question to run'),
      format: z.enum(['csv', 'json', 'xlsx']).describe('Download file format'),
      parameters: z
        .array(z.any())
        .optional()
        .describe('Question parameter values using Metabase parameter objects'),
      formatRows: z
        .boolean()
        .optional()
        .describe('Apply visualization formatting to CSV or JSON values'),
      pivotResults: z.boolean().optional().describe('Export pivoted results when supported')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('ID of the exported question'),
      format: z.string().describe('Export format'),
      fileName: z.string().describe('Suggested file name'),
      mimeType: z.string().describe('MIME type of the downloadable file'),
      byteLength: z.number().describe('Downloaded file size in bytes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MetabaseClient(ctx.auth);
    let result = await client.exportCardQuery(ctx.input.cardId, ctx.input.format, {
      parameters: ctx.input.parameters,
      formatRows: ctx.input.formatRows,
      pivotResults: ctx.input.pivotResults
    });
    let mimeType = mimeTypes[ctx.input.format];
    let fileName = `metabase-question-${ctx.input.cardId}.${ctx.input.format}`;
    return {
      output: {
        cardId: ctx.input.cardId,
        format: ctx.input.format,
        fileName,
        mimeType,
        byteLength: result.byteLength
      },
      attachments: [createBase64Attachment(result.contentBase64, mimeType)],
      message: `Exported question ${ctx.input.cardId} as a downloadable ${ctx.input.format.toUpperCase()} file.`
    };
  })
  .build();
