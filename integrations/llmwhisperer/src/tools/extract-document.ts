import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let extractDocument = SlateTool.create(spec, {
  name: 'Extract Document',
  key: 'extract_document',
  description: `Submit a document for text extraction. Accepts a document URL and converts it into LLM-optimized text using various extraction modes (native text, OCR, form, table).
Returns a whisper hash that can be used to check status and retrieve results. For large or complex documents, processing is asynchronous — use **Get Extraction Status** to poll for completion and **Retrieve Extraction** to get the text.`,
  instructions: [
    'Choose the extraction mode based on your document type: use "native_text" for digital PDFs, "low_cost" for decent scans, "high_quality" for handwritten/poor scans, "form" for form documents, "table" for spreadsheets and financial reports.',
    'Set "addLineNos" to true if you plan to use the highlights API later for bounding box coordinates.',
    'Use "pagesToExtract" to limit extraction to specific pages (e.g., "1-5,7,21-").'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      documentUrl: z
        .string()
        .describe('Publicly accessible URL of the document to extract text from'),
      mode: z
        .enum(['native_text', 'low_cost', 'high_quality', 'form', 'table'])
        .optional()
        .describe('Extraction mode. Defaults to "form".'),
      outputMode: z
        .enum(['layout_preserving', 'text'])
        .optional()
        .describe(
          'Output format. "layout_preserving" maintains document structure. Defaults to "layout_preserving".'
        ),
      pagesToExtract: z
        .string()
        .optional()
        .describe('Pages to extract (e.g., "1-5,7,21-"). Omit to extract all pages.'),
      pageSeparator: z
        .string()
        .optional()
        .describe('String used to separate pages in output. Defaults to "<<<".'),
      medianFilterSize: z
        .number()
        .optional()
        .describe(
          'Median filter size for noise removal on scanned images (low_cost mode only).'
        ),
      gaussianBlurRadius: z
        .number()
        .optional()
        .describe(
          'Gaussian blur radius for noise removal on scanned images (low_cost mode only).'
        ),
      lineSplitterTolerance: z
        .number()
        .optional()
        .describe('Baseline threshold for line break detection. Defaults to 0.4.'),
      lineSplitterStrategy: z
        .string()
        .optional()
        .describe('Line splitting strategy. Defaults to "left-priority".'),
      horizontalStretchFactor: z
        .number()
        .optional()
        .describe('Horizontal stretch adjustment. Defaults to 1.0.'),
      markVerticalLines: z
        .boolean()
        .optional()
        .describe('Whether to reproduce vertical lines in the output.'),
      markHorizontalLines: z
        .boolean()
        .optional()
        .describe('Whether to reproduce horizontal lines in the output.'),
      addLineNos: z
        .boolean()
        .optional()
        .describe('Enable line numbering and metadata for use with the highlights API.'),
      tag: z.string().optional().describe('Tag for auditing and usage tracking.'),
      fileName: z.string().optional().describe('Original file name for auditing.'),
      useWebhook: z
        .string()
        .optional()
        .describe('Name of a registered webhook to receive results upon completion.'),
      webhookMetadata: z
        .string()
        .optional()
        .describe('Custom metadata string to include in the webhook callback payload.')
    })
  )
  .output(
    z.object({
      whisperHash: z
        .string()
        .describe(
          'Unique identifier for this extraction job. Use this to check status and retrieve results.'
        ),
      status: z
        .string()
        .describe('Current status of the extraction job (e.g., "processing").'),
      message: z.string().describe('Status message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.whisperFromUrl(ctx.input.documentUrl, {
      mode: ctx.input.mode,
      outputMode: ctx.input.outputMode,
      pagesToExtract: ctx.input.pagesToExtract,
      pageSeparator: ctx.input.pageSeparator,
      medianFilterSize: ctx.input.medianFilterSize,
      gaussianBlurRadius: ctx.input.gaussianBlurRadius,
      lineSplitterTolerance: ctx.input.lineSplitterTolerance,
      lineSplitterStrategy: ctx.input.lineSplitterStrategy,
      horizontalStretchFactor: ctx.input.horizontalStretchFactor,
      markVerticalLines: ctx.input.markVerticalLines,
      markHorizontalLines: ctx.input.markHorizontalLines,
      addLineNos: ctx.input.addLineNos,
      tag: ctx.input.tag,
      fileName: ctx.input.fileName,
      useWebhook: ctx.input.useWebhook,
      webhookMetadata: ctx.input.webhookMetadata
    });

    return {
      output: result,
      message: `Document extraction job submitted. Whisper hash: **${result.whisperHash}**. Status: ${result.status}.`
    };
  })
  .build();
