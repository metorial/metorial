import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let parseDocument = SlateTool.create(spec, {
  name: 'Parse Document',
  key: 'parse_document',
  description:
    'Parse a PDF with a PDF4me dashboard parsing template and return extracted structured data, document type, page count, and confidence when available.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z
        .string()
        .optional()
        .describe(
          'Base64-encoded PDF file content. If omitted, PDF4me resolves the document by fileName.'
        ),
      fileName: z.string().describe('PDF file name to parse'),
      templateId: z.string().describe('PDF4me parse template GUID from the dashboard'),
      parseId: z.string().describe('Unique GUID for this parsing operation'),
      templateName: z
        .string()
        .optional()
        .describe('Optional parse template name from the PDF4me dashboard')
    })
  )
  .output(
    z.object({
      parsedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Template-extracted field values'),
      documentType: z.string().optional().describe('Parsed document type'),
      pageCount: z.number().optional().describe('Parsed document page count'),
      confidence: z.number().optional().describe('Parsing confidence score from 0 to 1')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.parseDocument({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      TemplateId: ctx.input.templateId,
      TemplateName: ctx.input.templateName,
      ParseId: ctx.input.parseId
    });

    return {
      output: result,
      message: `Parsed **${ctx.input.fileName}** with template **${ctx.input.templateId}**`
    };
  })
  .build();
