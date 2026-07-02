import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let queryDocument = SlateTool.create(spec, {
  name: 'Query Document',
  key: 'query_document',
  description: `Extract structured data from a PDF or image file (JPEG, JPG, PNG) using an AgentQL query or natural language prompt. Upload the file as base64-encoded content along with a query that defines the data to extract.

Useful for parsing invoices, receipts, forms, tables, or any structured information from documents and images.`,
  instructions: [
    'Either "query" or "prompt" must be provided, but not both.',
    'The file must be provided as a base64-encoded string.',
    'Supported formats: PDF, JPEG, JPG, PNG.'
  ],
  constraints: ['Consumes 1 API call per image, and 1 API call per page within a PDF.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded file content'),
      fileName: z
        .string()
        .describe('File name with extension (e.g. "invoice.pdf", "receipt.png")'),
      query: z
        .string()
        .optional()
        .describe('Structured AgentQL query defining the exact output shape'),
      prompt: z
        .string()
        .optional()
        .describe('Natural language description of the data to extract'),
      mode: z
        .enum(['fast', 'standard'])
        .optional()
        .describe(
          'Extraction mode: "fast" for speed (default), "standard" for deeper analysis'
        )
    })
  )
  .output(
    z.object({
      extractedData: z
        .record(z.string(), z.unknown())
        .describe('Structured data extracted from the document'),
      requestId: z.string().describe('Unique identifier for the request')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let fileBuffer = Buffer.from(ctx.input.fileContent, 'base64');

    let result = await client.queryDocument(fileBuffer, ctx.input.fileName, {
      query: ctx.input.query,
      prompt: ctx.input.prompt,
      mode: ctx.input.mode
    });

    let dataKeys = Object.keys(result.data);
    return {
      output: {
        extractedData: result.data,
        requestId: result.metadata.request_id
      },
      message: `Extracted data from **${ctx.input.fileName}**. Retrieved ${dataKeys.length} top-level field(s): ${dataKeys.join(', ')}.`
    };
  })
  .build();
