import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

let predictionSchema = z.object({
  predictionId: z.string().optional().describe('Unique prediction identifier'),
  label: z.string().describe('Field or table header name'),
  extractedText: z.string().describe('Extracted/predicted value'),
  confidence: z.number().describe('Confidence score between 0 and 1'),
  type: z.string().describe('Prediction type: "field" or "table"'),
  page: z.number().describe('0-indexed page number'),
  boundingBox: z
    .object({
      xmin: z.number(),
      ymin: z.number(),
      xmax: z.number(),
      ymax: z.number()
    })
    .optional()
    .describe('Bounding box coordinates of the extracted region')
});

let pageResultSchema = z.object({
  pageIndex: z.number().describe('0-indexed page number'),
  fileId: z.string().optional().describe('Unique file identifier for this page'),
  requestFileId: z
    .string()
    .optional()
    .describe('Request file ID for retrieving results later'),
  predictions: z.array(predictionSchema).describe('Extracted predictions for this page'),
  fileUrl: z.string().optional().describe('URL of the processed file'),
  requestMetadata: z.string().optional().describe('Metadata echoed from the request'),
  processingType: z
    .string()
    .optional()
    .describe('Nanonets processing mode reported for the page')
});

export let extractDocumentData = SlateTool.create(spec, {
  name: 'Extract Document Data',
  key: 'extract_document_data',
  description: `Upload a document to a Nanonets OCR model and extract structured data. Supports processing documents via URL. Returns extracted fields, tables, bounding boxes, and confidence scores. Use synchronous mode for small documents (≤3 pages) and async mode for larger files.`,
  instructions: [
    'Provide the modelId of an OCR model that has been configured with the fields you want to extract.',
    'For async mode, the response will contain request file IDs that you can use with the "Get Prediction Results" tool to retrieve results later.'
  ],
  constraints: [
    'Synchronous mode is optimized for files with 3 or fewer pages.',
    'Async processing typically completes within 5 minutes.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the OCR model to use for extraction'),
      urls: z
        .array(z.string())
        .min(1)
        .describe('URLs of documents or images to process (PDF, PNG, JPG)'),
      asyncMode: z
        .boolean()
        .default(false)
        .describe(
          'Use async processing for large documents. Results must be retrieved separately.'
        ),
      language: z
        .string()
        .optional()
        .describe(
          'Optional OCR language code. Omit unless a specific language is required; Nanonets generally recommends no language parameter for best results.'
        ),
      requestMetadata: z
        .string()
        .optional()
        .describe('Optional metadata string stored with the uploaded document'),
      pagesToProcess: z
        .string()
        .optional()
        .describe(
          'Optional comma-separated page numbers to process, such as "1,2". Applies to PDF documents.'
        )
    })
  )
  .output(
    z.object({
      message: z.string().describe('Processing status message'),
      pages: z.array(pageResultSchema).describe('Extraction results per page'),
      isAsync: z.boolean().describe('Whether the request was processed asynchronously'),
      signedUrls: z
        .record(z.string(), z.any())
        .optional()
        .describe('Signed file URLs returned by Nanonets, when available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    let result = await client.predictByUrl(ctx.input.modelId, ctx.input.urls, {
      asyncMode: ctx.input.asyncMode,
      language: ctx.input.language,
      requestMetadata: ctx.input.requestMetadata,
      pagesToProcess: ctx.input.pagesToProcess
    });

    let pages = (result.result || []).map((page: any) => ({
      pageIndex: page.page ?? 0,
      fileId: page.id,
      requestFileId: page.request_file_id,
      fileUrl: page.file_url,
      requestMetadata: page.request_metadata,
      processingType: page.processing_type,
      predictions: (page.prediction || []).map((pred: any) => ({
        predictionId: pred.id,
        label: pred.label,
        extractedText: pred.ocr_text || '',
        confidence: pred.score ?? 0,
        type: pred.type || 'field',
        page: pred.page ?? 0,
        boundingBox:
          pred.xmin != null
            ? {
                xmin: pred.xmin,
                ymin: pred.ymin,
                xmax: pred.xmax,
                ymax: pred.ymax
              }
            : undefined
      }))
    }));

    let totalPredictions = pages.reduce(
      (sum: number, p: any) => sum + p.predictions.length,
      0
    );

    if (ctx.input.asyncMode) {
      let fileIds = pages.map((p: any) => p.requestFileId).filter(Boolean);
      return {
        output: {
          message: result.message || 'Processing',
          pages,
          isAsync: true,
          signedUrls: result.signed_urls
        },
        message: `Submitted ${ctx.input.urls.length} document(s) for async processing. Request file IDs: ${fileIds.join(', ')}. Use "Get Prediction Results" to retrieve results when ready.`
      };
    }

    return {
      output: {
        message: result.message || 'Success',
        pages,
        isAsync: false,
        signedUrls: result.signed_urls
      },
      message: `Extracted **${totalPredictions}** predictions across **${pages.length}** page(s) from ${ctx.input.urls.length} document(s).`
    };
  })
  .build();
