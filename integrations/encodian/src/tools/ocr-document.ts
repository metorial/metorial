import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let ocrDocument = SlateTool.create(spec, {
  name: 'OCR Document',
  key: 'ocr_document',
  description: `Extract text from scanned documents, images, and PDFs using Optical Character Recognition (OCR).
Supports standard and AI-enhanced OCR modes with configurable language, quality, and clean-up options. Can process PDF documents and image files (JPG, PNG, TIFF, BMP).`,
  instructions: [
    'For PDF OCR, the output is a searchable PDF with an embedded text layer.',
    'For image OCR, the extracted text is returned directly.',
    'AI OCR mode generally provides better accuracy but uses more credits.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceType: z
        .enum(['pdf', 'image'])
        .describe('Whether the source is a PDF or an image file'),
      ocrMode: z
        .enum(['standard', 'ai'])
        .optional()
        .describe('OCR mode: standard or AI-enhanced (default: standard)'),
      fileContent: z.string().describe('Base64-encoded file content'),
      fileName: z
        .string()
        .optional()
        .describe('Filename with extension (required for image OCR)'),
      imageType: z
        .enum(['JPG', 'PNG', 'TIFF', 'BMP'])
        .optional()
        .describe('Image type (required for image OCR)'),
      language: z.string().optional().describe('OCR language (default: English)'),
      autoRotate: z.boolean().optional().describe('Auto-rotate the document'),
      deskew: z.boolean().optional().describe('Correct document skew'),
      despeckle: z.boolean().optional().describe('Remove noise/speckles')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output filename (for PDF OCR)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded searchable PDF (for PDF OCR)'),
      text: z.string().optional().describe('Extracted text content (for image OCR)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.sourceType === 'pdf') {
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent,
        ocrLanguage: ctx.input.language || 'English'
      };

      let result: any;
      if (ctx.input.ocrMode === 'ai') {
        result = await client.aiOcrPdf(body);
      } else {
        if (ctx.input.autoRotate !== undefined) body.autoRotate = ctx.input.autoRotate;
        if (ctx.input.deskew !== undefined) body.deskew = ctx.input.deskew;
        if (ctx.input.despeckle !== undefined) body.despeckle = ctx.input.despeckle;
        result = await client.ocrPdf(body);
      }

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationId: result.OperationId
        },
        message: `Successfully applied ${ctx.input.ocrMode === 'ai' ? 'AI' : 'standard'} OCR to PDF. Output: **${result.Filename}**`
      };
    } else {
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent,
        fileName: ctx.input.fileName || 'image',
        imageType: ctx.input.imageType || 'JPG',
        ocrLanguage: ctx.input.language || 'English'
      };

      if (ctx.input.autoRotate !== undefined) body.AutoRotate = ctx.input.autoRotate;
      if (ctx.input.deskew !== undefined) body.Deskew = ctx.input.deskew;
      if (ctx.input.despeckle !== undefined) body.Despeckle = ctx.input.despeckle;

      let result = await client.extractTextFromImage(body);

      return {
        output: {
          text: result.Text || result.text || '',
          operationId: result.OperationId
        },
        message: `Successfully extracted text from image using OCR.`
      };
    }
  })
  .build();
