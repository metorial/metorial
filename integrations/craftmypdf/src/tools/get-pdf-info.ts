import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPdfInfo = SlateTool.create(spec, {
  name: 'Get PDF Info',
  key: 'get_pdf_info',
  description: `Extract metadata and structural information from a PDF document. Returns page count, page dimensions, and a list of fillable form fields with their types and current values.`,
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
        .describe('List of fillable form fields in the PDF.')
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
        pageCount: result.page_count,
        pages: result.pages || [],
        formFields
      },
      message: `PDF has **${result.page_count}** page(s) and **${formFields.length}** form field(s).`
    };
  })
  .build();
