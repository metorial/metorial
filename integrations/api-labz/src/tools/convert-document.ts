import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Convert documents between various formats using AI-powered document processing. Supports a wide range of conversions including PDF, Word, images, audio, spreadsheets, HTML, Markdown, JSON, CSV, and more.

Describe the conversion you need in plain English along with the source document. Supports both file URLs and base64-encoded file content.`,
  instructions: [
    'Provide either a file URL or a base64-encoded file string, not both.',
    'Describe what conversion or transformation you need in the instructions field.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instructions: z
        .string()
        .describe(
          'Plain English description of the desired conversion, e.g. "Convert this PDF to Word document"'
        ),
      fileUrl: z.string().optional().describe('Public URL of the source file to convert'),
      base64String: z
        .string()
        .optional()
        .describe('Base64-encoded content of the source file'),
      fileName: z
        .string()
        .optional()
        .describe('Original file name with extension, e.g. "report.pdf"'),
      outputFormat: z
        .string()
        .optional()
        .describe('Desired output format, e.g. "docx", "pdf", "html", "markdown"')
    })
  )
  .output(
    z.object({
      conversionResult: z.any().describe('The converted document content or download URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Converting document...');

    let result = await client.convertDocument({
      instructions: ctx.input.instructions,
      fileUrl: ctx.input.fileUrl,
      base64String: ctx.input.base64String,
      fileName: ctx.input.fileName,
      outputFormat: ctx.input.outputFormat
    });

    return {
      output: {
        conversionResult: result
      },
      message: `Successfully converted the document as requested.`
    };
  })
  .build();
