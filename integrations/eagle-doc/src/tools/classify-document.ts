import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let classifyDocument = SlateTool.create(spec, {
  name: 'Classify Document',
  key: 'classify_document',
  description:
    'Identify a document type before routing it for OCR extraction. Returns the document type and processing metadata without extracting its fields.',
  instructions: [
    'Pass the returned document type into Process Any Document, or route Invoice and Receipt to Process Finance Document.'
  ],
  constraints: [
    'Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF. Classification consumes page quota.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded document file content'),
      fileName: z.string().describe('Original file name with extension'),
      privacy: z
        .boolean()
        .optional()
        .describe('When true, the file is not stored on the server. Defaults to true.')
    })
  )
  .output(
    z.object({
      docType: z
        .string()
        .describe('Recognized document type; empty when no type could be assigned'),
      numberOfPages: z
        .number()
        .optional()
        .describe('Pages processed and charged against quota'),
      fileHash: z.string().optional().describe('Checksum for duplicate detection'),
      duration: z.number().optional().describe('Processing time in seconds'),
      version: z.string().optional().describe('Processing engine version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.classifyDocument(ctx.input);
    return {
      output: {
        docType: result.DocType,
        numberOfPages: result.NumberOfPages,
        fileHash: result.FileHash,
        duration: result.Duration,
        version: result.Version
      },
      message: result.DocType
        ? `Document classified as **${result.DocType}**.`
        : 'The document could not be assigned to a document type.'
    };
  })
  .build();
