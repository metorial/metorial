import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generate a document from a DOCX, PDF, or HTML template with dynamic data. Supports mail merge with JSON data, dynamic tables, and merge fields.
Use for automating contracts, invoices, reports, and other data-driven documents.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      templateFileType: z.enum(['docx', 'pdf', 'html']).describe('Template file type'),
      templateFileName: z.string().describe('Template file name with extension'),
      templateFileContent: z.string().describe('Base64-encoded template file content'),
      documentDataType: z.enum(['json', 'excel']).describe('Type of data source'),
      documentDataText: z
        .string()
        .optional()
        .describe('JSON data string for document generation'),
      documentDataFile: z
        .string()
        .optional()
        .describe('Base64-encoded data file content (Excel or JSON file)'),
      fieldMetadata: z
        .string()
        .optional()
        .describe('Metadata for template fields in JSON format'),
      outputType: z
        .enum(['pdf', 'docx', 'html'])
        .default('pdf')
        .describe('Output document format'),
      keepPdfEditable: z
        .boolean()
        .optional()
        .describe('Keep PDF form fields editable in the output')
    })
  )
  .output(
    z.object({
      fileContent: z.string().describe('Base64-encoded generated document'),
      fileName: z.string().describe('Output file name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateDocument({
      templateFileType: ctx.input.templateFileType,
      templateFileName: ctx.input.templateFileName,
      templateFileData: ctx.input.templateFileContent,
      documentDataType: ctx.input.documentDataType,
      documentDataText: ctx.input.documentDataText,
      documentDataFile: ctx.input.documentDataFile,
      metaDataJson: ctx.input.fieldMetadata,
      outputType: ctx.input.outputType,
      keepPdfEditable: ctx.input.keepPdfEditable
    });

    return {
      output: result,
      message: `Successfully generated ${ctx.input.outputType} document: **${result.fileName}**`
    };
  })
  .build();
