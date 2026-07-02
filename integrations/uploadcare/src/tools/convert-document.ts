import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Convert documents between formats (DOC, DOCX, XLS, XLSX, PDF, JPG, PNG, etc.). Conversion is asynchronous — this tool starts the job and returns a token for status polling. For image output formats, you can specify page number, DPI, and quality.`,
  instructions: [
    'The conversion path format is: `:uuid/document/-/format/:target_format/` with optional `-/page/:number/`, `-/dpi/:value/`, `-/quality/:value/`.',
    'Supported target formats: doc, docx, xls, xlsx, odt, ods, rtf, txt, pdf, jpg, png.'
  ]
})
  .input(
    z.object({
      fileId: z.string().describe('UUID of the source document file'),
      targetFormat: z
        .enum(['doc', 'docx', 'xls', 'xlsx', 'odt', 'ods', 'rtf', 'txt', 'pdf', 'jpg', 'png'])
        .describe('Target format for conversion'),
      page: z
        .number()
        .optional()
        .describe('Page number to convert (1-based, for jpg/png output only)'),
      dpi: z
        .enum(['72', '96', '150', '200', '250', '300', '600'])
        .optional()
        .describe('DPI for image output (for jpg/png only)'),
      quality: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Quality for image output (10-100, for jpg/png only)'),
      store: z
        .boolean()
        .optional()
        .describe('Whether to permanently store the converted file'),
      saveInGroup: z
        .boolean()
        .optional()
        .describe('Save multi-page conversion as a file group instead of zip (jpg/png only)')
    })
  )
  .output(
    z.object({
      conversionToken: z.number().describe('Token for checking conversion status'),
      resultFileId: z
        .string()
        .describe('UUID of the result file (may not be ready immediately)'),
      problems: z
        .record(z.string(), z.string())
        .describe('Any problems encountered during conversion')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let path = `${ctx.input.fileId}/document/-/format/${ctx.input.targetFormat}/`;
    if (ctx.input.page !== undefined) path += `-/page/${ctx.input.page}/`;
    if (ctx.input.dpi !== undefined) path += `-/dpi/${ctx.input.dpi}/`;
    if (ctx.input.quality !== undefined) path += `-/quality/${ctx.input.quality}/`;

    let result = await client.convertDocument([path], ctx.input.store, ctx.input.saveInGroup);

    let first = result.result[0];
    if (!first) {
      throw new Error('No conversion result returned');
    }

    return {
      output: {
        conversionToken: first.token,
        resultFileId: first.uuid,
        problems: result.problems
      },
      message: `Document conversion started. Result file UUID: **${first.uuid}**, token: \`${first.token}\`.`
    };
  })
  .build();

export let getDocumentConversionStatus = SlateTool.create(spec, {
  name: 'Get Document Conversion Status',
  key: 'get_document_conversion_status',
  description: `Check the status of an asynchronous document conversion job. Returns the current status and the resulting file info when complete.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      conversionToken: z
        .number()
        .describe('Conversion token returned by the Convert Document tool')
    })
  )
  .output(
    z.object({
      status: z
        .enum(['pending', 'processing', 'finished', 'failed', 'cancelled'])
        .describe('Current conversion status'),
      error: z.string().nullable().describe('Error message if the conversion failed'),
      resultFileId: z
        .string()
        .nullable()
        .describe('UUID of the converted file (available when finished)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let status = await client.getDocumentConversionStatus(ctx.input.conversionToken);

    return {
      output: {
        status: status.status as any,
        error: status.error,
        resultFileId: status.result?.uuid ?? null
      },
      message: `Conversion status: **${status.status}**.${status.result ? ` Result file: ${status.result.uuid}` : ''}${status.error ? ` Error: ${status.error}` : ''}`
    };
  })
  .build();
