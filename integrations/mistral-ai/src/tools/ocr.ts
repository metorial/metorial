import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { mistralServiceError } from '../lib/errors';
import { spec } from '../spec';

let pageSchema = z.object({
  index: z.number().describe('Page index (0-based)'),
  markdown: z.string().describe('Extracted page content in markdown format'),
  images: z.array(z.any()).optional().describe('Extracted images from the page'),
  tables: z.array(z.any()).optional().describe('Extracted tables from the page'),
  header: z.string().nullable().optional().describe('Extracted page header'),
  footer: z.string().nullable().optional().describe('Extracted page footer'),
  dimensions: z
    .object({
      dpi: z.number().optional().describe('Page DPI'),
      height: z.number().optional().describe('Page height in pixels'),
      width: z.number().optional().describe('Page width in pixels')
    })
    .optional()
    .describe('Page dimensions')
});

let mimeTypeFromImageId = (imageId: unknown) => {
  if (typeof imageId !== 'string') {
    return 'image/jpeg';
  }

  let lower = imageId.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
};

let stripDataUrlPrefix = (content: string) => {
  let commaIndex = content.indexOf(',');
  return content.slice(0, 32).includes(';base64,') && commaIndex >= 0
    ? content.slice(commaIndex + 1)
    : content;
};

export let extractDocumentTool = SlateTool.create(spec, {
  name: 'Extract Document (OCR)',
  key: 'extract_document',
  description: `Extract text, tables, and images from documents using Mistral OCR. Supports PDFs and images. Returns structured content in markdown format with optional table formatting (markdown or HTML). Can extract headers, footers, and hyperlinks.`,
  instructions: [
    'Provide a document URL or image URL as input.',
    'For PDFs uploaded to Mistral, use documentType "file" with a fileId.',
    'Use the pages parameter to extract specific pages from a PDF.',
    'Set tableFormat to "markdown" or "html" for structured table output.'
  ],
  constraints: ['Maximum file size: 50 MB', 'Maximum pages: 1000'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentType: z
        .enum(['document_url', 'image_url', 'file'])
        .describe('Type of document source'),
      documentUrl: z
        .string()
        .optional()
        .describe('URL of a PDF document (for document_url type)'),
      imageUrl: z.string().optional().describe('URL of an image (for image_url type)'),
      fileId: z.string().optional().describe('Mistral file ID (for file type)'),
      model: z.string().default('mistral-ocr-latest').describe('OCR model ID'),
      pages: z
        .array(z.number())
        .optional()
        .describe('Specific page indices to extract (0-based)'),
      includeImageBase64: z
        .boolean()
        .optional()
        .describe('Include base64-encoded images in response'),
      imageLimit: z.number().optional().describe('Maximum number of images to extract'),
      imageMinSize: z.number().optional().describe('Minimum image height/width in pixels'),
      tableFormat: z
        .enum(['markdown', 'html'])
        .optional()
        .describe('Format for extracted tables'),
      extractHeader: z.boolean().optional().describe('Extract page headers separately'),
      extractFooter: z.boolean().optional().describe('Extract page footers separately'),
      bboxAnnotationFormat: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON schema response format for extracted bounding boxes/images'),
      documentAnnotationFormat: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON schema response format for the entire document'),
      documentAnnotationPrompt: z
        .string()
        .optional()
        .describe('Prompt for document-level structured extraction'),
      confidenceScoresGranularity: z
        .enum(['word', 'page'])
        .optional()
        .describe('Granularity for OCR confidence scores')
    })
  )
  .output(
    z.object({
      model: z.string().describe('Model used'),
      pages: z.array(pageSchema).describe('Extracted pages'),
      pagesProcessed: z.number().describe('Number of pages processed'),
      documentSizeBytes: z.number().optional().describe('Document size in bytes'),
      documentAnnotation: z
        .string()
        .nullable()
        .optional()
        .describe('Document-level structured annotation when requested'),
      imageAttachmentCount: z
        .number()
        .describe('Number of extracted image attachments returned separately')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let document: any;
    if (ctx.input.documentType === 'document_url') {
      if (!ctx.input.documentUrl) {
        throw mistralServiceError('documentUrl is required for document_url OCR input');
      }
      document = { type: 'document_url', document_url: ctx.input.documentUrl };
    } else if (ctx.input.documentType === 'image_url') {
      if (!ctx.input.imageUrl) {
        throw mistralServiceError('imageUrl is required for image_url OCR input');
      }
      document = { type: 'image_url', image_url: ctx.input.imageUrl };
    } else {
      if (!ctx.input.fileId) {
        throw mistralServiceError('fileId is required for file OCR input');
      }
      document = { type: 'file', file_id: ctx.input.fileId };
    }

    if (ctx.input.documentAnnotationPrompt && !ctx.input.documentAnnotationFormat) {
      throw mistralServiceError(
        'documentAnnotationFormat is required when documentAnnotationPrompt is provided'
      );
    }

    let result = await client.ocr({
      model: ctx.input.model,
      document,
      pages: ctx.input.pages,
      includeImageBase64: ctx.input.includeImageBase64,
      imageLimit: ctx.input.imageLimit,
      imageMinSize: ctx.input.imageMinSize,
      tableFormat: ctx.input.tableFormat,
      extractHeader: ctx.input.extractHeader,
      extractFooter: ctx.input.extractFooter,
      bboxAnnotationFormat: ctx.input.bboxAnnotationFormat,
      documentAnnotationFormat: ctx.input.documentAnnotationFormat,
      documentAnnotationPrompt: ctx.input.documentAnnotationPrompt,
      confidenceScoresGranularity: ctx.input.confidenceScoresGranularity
    });

    let attachments: ReturnType<typeof createBase64Attachment>[] = [];
    let pages = (result.pages || []).map((p: any) => ({
      index: p.index,
      markdown: p.markdown || '',
      images: p.images?.map((image: any) => {
        let { image_base64, ...metadata } = image;
        if (typeof image_base64 === 'string' && image_base64.length > 0) {
          attachments.push(
            createBase64Attachment(
              stripDataUrlPrefix(image_base64),
              mimeTypeFromImageId(image.id)
            )
          );
        }
        return metadata;
      }),
      tables: p.tables,
      header: p.header,
      footer: p.footer,
      dimensions: p.dimensions
    }));

    return {
      output: {
        model: result.model,
        pages,
        pagesProcessed: result.usage_info?.pages_processed || pages.length,
        documentSizeBytes: result.usage_info?.doc_size_bytes,
        documentAnnotation: result.document_annotation,
        imageAttachmentCount: attachments.length
      },
      attachments,
      message: `Extracted ${pages.length} page(s) from document using **${result.model}**.`
    };
  })
  .build();
