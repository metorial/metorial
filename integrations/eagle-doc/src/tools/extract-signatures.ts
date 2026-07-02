import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let extractSignatures = SlateTool.create(spec, {
  name: 'Extract Signatures',
  key: 'extract_signatures',
  description: `Detect and extract signatures from any document. Returns base64-encoded signature images, bounding box coordinates, page numbers, and confidence scores for each detected signature.`,
  instructions: ['Provide the document as a base64-encoded file with its original file name.'],
  constraints: ['Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded document file content'),
      fileName: z.string().describe('Original file name with extension (e.g., "contract.pdf")')
    })
  )
  .output(
    z.object({
      signatures: z
        .array(
          z
            .object({
              page: z
                .number()
                .optional()
                .describe('Page number where the signature was found (1-based)'),
              boundingBox: z
                .array(z.number())
                .optional()
                .describe('Bounding box [left, top, right, bottom]'),
              image: z.string().optional().describe('Base64-encoded PNG signature image'),
              binary: z.string().optional().describe('Base64-encoded binary signature image'),
              confidence: z.number().optional().describe('Detection confidence score (0-1)')
            })
            .passthrough()
        )
        .describe('Detected signatures'),
      fileHash: z.string().optional().describe('MD5 hash of the document'),
      version: z.string().optional().describe('API version used'),
      numberOfPages: z.number().optional().describe('Total pages processed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Extracting signatures...');

    let result = await client.extractSignatures({
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName
    });

    let signatureCount = result.signatures?.length || 0;

    return {
      output: result,
      message: `Found **${signatureCount}** signature(s) across ${result.numberOfPages || 'unknown'} page(s).`
    };
  })
  .build();
