import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfToJson = SlateTool.create(spec, {
  name: 'PDF to JSON',
  key: 'pdf_to_json',
  description: `Extract structured JSON data from PDF documents using a customizable schema. Define the fields you want to extract and the module will parse the PDF content into organized JSON matching your template.

Useful for extracting invoices, receipts, forms, contracts, and other structured documents into machine-readable data.`,
  instructions: [
    'Provide either a file URL or a base64-encoded PDF string.',
    'Define a schema describing the JSON structure you want to extract from the PDF.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      schema: z
        .string()
        .describe(
          'JSON schema or template describing the structure of data to extract, e.g. \'{"invoice_number": "string", "total": "number", "items": [{"name": "string", "price": "number"}]}\''
        ),
      fileUrl: z.string().optional().describe('Public URL of the PDF file'),
      base64String: z.string().optional().describe('Base64-encoded PDF file content')
    })
  )
  .output(
    z.object({
      extractedJson: z
        .any()
        .describe('Structured JSON data extracted from the PDF matching the provided schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Extracting JSON from PDF...');

    let result = await client.pdfToJson({
      schema: ctx.input.schema,
      fileUrl: ctx.input.fileUrl,
      base64String: ctx.input.base64String
    });

    return {
      output: {
        extractedJson: result
      },
      message: `Successfully extracted structured JSON data from the PDF document.`
    };
  })
  .build();
