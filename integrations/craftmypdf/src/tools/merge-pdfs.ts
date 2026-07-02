import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergePdfs = SlateTool.create(spec, {
  name: 'Merge PDFs',
  key: 'merge_pdfs',
  description: `Merge multiple PDFs into a single document. Supports two modes:
- **By URL**: Combine existing PDF files by providing their URLs.
- **By Template**: Generate PDFs from multiple templates with their own data and merge them into one document.

Use "pdfUrls" for URL-based merging, or "templates" for template-based merging.`,
  instructions: [
    'Provide either "pdfUrls" for URL-based merging or "templates" for template-based merging.',
    'For template-based merging, each template can have its own data, or use "sharedData" as a fallback.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      pdfUrls: z
        .array(z.string())
        .optional()
        .describe(
          'List of PDF URLs to merge into one document. Use this for URL-based merging.'
        ),
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template ID to use for this section.'),
            templateData: z
              .record(z.string(), z.unknown())
              .optional()
              .describe('JSON data for this specific template.')
          })
        )
        .optional()
        .describe('List of templates with their data for multi-template merging.'),
      sharedData: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Fallback JSON data for templates that do not specify their own data.'),
      paging: z
        .enum(['continuous', 'reset'])
        .optional()
        .describe(
          'Page numbering: "continuous" for sequential numbering, "reset" to restart numbering per document.'
        ),
      expiration: z
        .number()
        .optional()
        .describe('Expiration time in minutes for the merged PDF URL (1-10080).'),
      outputFile: z.string().optional().describe('Output filename for the merged PDF.')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().describe('URL to download the merged PDF.'),
      transactionRef: z.string().describe('Unique transaction reference.'),
      status: z.string().describe('Status of the merge request.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Merging PDFs...');

    let result: { status: string; file: string; transaction_ref: string };

    if (ctx.input.pdfUrls && ctx.input.pdfUrls.length > 0) {
      result = await client.mergePdfUrls({
        urls: ctx.input.pdfUrls,
        expiration: ctx.input.expiration,
        outputFile: ctx.input.outputFile
      });
    } else if (ctx.input.templates && ctx.input.templates.length > 0) {
      result = await client.createMerge({
        templates: ctx.input.templates.map(t => ({
          templateId: t.templateId,
          data: t.templateData
        })),
        data: ctx.input.sharedData,
        paging: ctx.input.paging,
        exportType: 'json',
        expiration: ctx.input.expiration,
        outputFile: ctx.input.outputFile
      });
    } else {
      throw new Error('Either "pdfUrls" or "templates" must be provided.');
    }

    let mode = ctx.input.pdfUrls ? 'URL' : 'template';
    let count = ctx.input.pdfUrls?.length || ctx.input.templates?.length || 0;

    return {
      output: {
        fileUrl: result.file,
        transactionRef: result.transaction_ref,
        status: result.status
      },
      message: `Merged ${count} PDFs (${mode}-based) successfully. [Download Merged PDF](${result.file})`
    };
  })
  .build();
