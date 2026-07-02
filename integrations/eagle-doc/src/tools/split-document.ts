import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let splitDocument = SlateTool.create(spec, {
  name: 'Split Document',
  key: 'split_document',
  description: `Split a multi-page document (e.g., a PDF containing multiple separate documents) into logical segments. Returns page ranges indicating where each individual document starts and ends within the uploaded file.`,
  instructions: [
    'Provide the multi-page document as a base64-encoded file.',
    'The result contains page ranges: each segment is a [startPage, endPage] pair.'
  ],
  constraints: [
    'Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF.',
    'Best suited for multi-page PDFs containing multiple documents.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded document file content'),
      fileName: z
        .string()
        .describe('Original file name with extension (e.g., "combined_documents.pdf")')
    })
  )
  .output(
    z.object({
      segments: z
        .array(z.array(z.number()).describe('[startPage, endPage] range'))
        .describe('Page ranges for each detected document segment')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Splitting document...');

    let result = await client.splitDocument({
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName
    });

    let segments = Array.isArray(result) ? result : [];
    let segmentDescriptions = segments.map((seg: number[]) => `pages ${seg[0]}-${seg[1]}`);

    return {
      output: { segments },
      message: `Document split into **${segments.length}** segment(s): ${segmentDescriptions.join(', ')}.`
    };
  })
  .build();
