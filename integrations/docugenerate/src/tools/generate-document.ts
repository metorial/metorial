import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocuGenerateClient } from '../lib/client';
import { spec } from '../spec';

export let generateDocument = SlateTool.create(spec, {
  name: 'Generate Document',
  key: 'generate_document',
  description: `Generates one or more documents by merging a template with dynamic data. Each object in the data array produces a separate document with merge tags replaced by the provided values. Supports multiple output formats and options like PDF attachments, PDF merging, and combining into a single file.`,
  instructions: [
    "The data array must contain at least one object. Each object's keys should match the merge tags defined in the template.",
    'Use attach and mergeWith only when outputFormat is a PDF variant (.pdf, .pdf/a-1b, .pdf/a-2b, .pdf/a-3b).'
  ],
  constraints: ['PDF attachments and merging are only available for PDF output formats.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to generate documents from'),
      data: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'Array of data objects. Each object generates one document by replacing merge tags with its values.'
        ),
      name: z.string().optional().describe('Name for the generated document(s)'),
      outputFormat: z
        .enum([
          '.pdf',
          '.docx',
          '.doc',
          '.odt',
          '.txt',
          '.html',
          '.png',
          '.pdf/a-1b',
          '.pdf/a-2b',
          '.pdf/a-3b'
        ])
        .optional()
        .describe('Output format for generated documents'),
      outputQuality: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Output quality (1-100). Applicable for PDF and image formats.'),
      singleFile: z
        .boolean()
        .optional()
        .describe(
          'When true, combines all generated documents into a single file. When false, creates a ZIP with individual files.'
        ),
      pageBreak: z
        .boolean()
        .optional()
        .describe(
          'When true, inserts page breaks between documents in a single combined file'
        ),
      attach: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('File URL(s) or Base64 data URI(s) to attach to the PDF output'),
      mergeWith: z
        .union([z.string(), z.array(z.string())])
        .optional()
        .describe('PDF URL(s) or Base64 data URI(s) to merge at the end of the generated PDF')
    })
  )
  .output(
    z.object({
      documents: z.array(
        z.object({
          documentId: z.string().describe('Unique ID of the generated document'),
          templateId: z.string().describe('ID of the template used'),
          created: z.number().describe('Creation timestamp (Unix epoch)'),
          name: z.string().describe('Name of the document'),
          filename: z.string().describe('Filename of the generated document'),
          format: z.string().describe('Output format of the document'),
          documentUri: z.string().describe('URL to download the generated document')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocuGenerateClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Generating document(s) from template...');

    let results = await client.generateDocument({
      templateId: ctx.input.templateId,
      data: ctx.input.data,
      name: ctx.input.name,
      outputFormat: ctx.input.outputFormat,
      outputQuality: ctx.input.outputQuality,
      singleFile: ctx.input.singleFile,
      pageBreak: ctx.input.pageBreak,
      attach: ctx.input.attach,
      mergeWith: ctx.input.mergeWith
    });

    let documents = results.map(doc => ({
      documentId: doc.id,
      templateId: doc.template_id,
      created: doc.created,
      name: doc.name,
      filename: doc.filename,
      format: doc.format,
      documentUri: doc.document_uri
    }));

    return {
      output: { documents },
      message: `Generated **${documents.length}** document(s). ${documents.map(d => `[${d.filename}](${d.documentUri})`).join(', ')}`
    };
  })
  .build();
