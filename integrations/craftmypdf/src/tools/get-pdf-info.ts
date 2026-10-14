import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPdfInfo = SlateTool.create(spec, {
  name: 'Get PDF Info',
  key: 'get_pdf_info',
  description: `Retrieve PDF page count and document metadata. Page dimensions and form fields are included only when returned by the provider.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pdfUrl: z.string().describe('URL of the PDF to analyze.')
    })
  )
  .output(
    z.object({
      pageCount: z.number().describe('Total number of pages in the PDF.'),
      pages: z
        .array(
          z.object({
            width: z.number().describe('Page width.'),
            height: z.number().describe('Page height.')
          })
        )
        .describe('Dimensions of each page.'),
      formFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Name of the form field.'),
            fieldType: z.string().describe('Type of the form field (e.g., text, checkbox).'),
            currentValue: z.string().describe('Current value of the form field.')
          })
        )
        .describe('List of fillable form fields in the PDF when available; otherwise empty.'),
      title: z.string().optional().describe('Document title.'),
      author: z.string().optional().describe('Document author.'),
      subject: z.string().optional().describe('Document subject.'),
      creator: z.string().optional().describe('Application that created the document.'),
      producer: z.string().optional().describe('PDF producer.'),
      creationDate: z.string().optional().describe('Document creation date.'),
      modificationDate: z.string().optional().describe('Document modification date.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    ctx.progress('Analyzing PDF...');

    let result = await client.getPdfInfo(ctx.input.pdfUrl);

    let formFields = (result.fields || []).map(f => ({
      fieldName: f.name,
      fieldType: f.type,
      currentValue: f.value || ''
    }));

    return {
      output: {
        pageCount: result.totalPages,
        pages: result.pages || [],
        formFields,
        title: result.title,
        author: result.author,
        subject: result.subject,
        creator: result.creator,
        producer: result.producer,
        creationDate: result.creationDate,
        modificationDate: result.modificationDate
      },
      message: `PDF has **${result.totalPages}** page(s).`
    };
  })
  .build();
