import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ocrspaceServiceError } from '../lib/errors';
import { spec } from '../spec';
import { languageEnum, validateLanguageForEngine, validateSingleSource } from './shared';

export let generateSearchablePdf = SlateTool.create(spec, {
  name: 'Generate Searchable PDF',
  key: 'generate_searchable_pdf',
  description: `Converts a scanned image or PDF into a searchable (sandwich) PDF with an embedded text layer. The generated PDF can be searched, copied from, and indexed.

Returns the generated PDF as a Slate attachment, plus metadata and extracted text.`,
  instructions: [
    'Provide exactly one of "sourceUrl" or "base64Image" as the input source.',
    'The generated PDF bytes are returned as a Slate attachment; the provider download URL is temporary and only included as metadata.',
    'Set "hideTextLayer" to true if you want the text layer to be invisible (useful for archival purposes).'
  ],
  constraints: [
    'Free tier: max 1 MB file size, max 3 PDF pages, watermark included in output.',
    'PRO PDF tier supports 100 MB+ and 999+ pages without watermark.',
    'Engine 3 does not support searchable PDF generation.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().optional().describe('URL of the image or PDF to convert'),
      base64Image: z
        .string()
        .optional()
        .describe(
          'Base64-encoded image/PDF with content-type prefix (e.g. "data:image/png;base64,...")'
        ),
      language: languageEnum
        .optional()
        .default('eng')
        .describe('Language code for OCR recognition'),
      ocrEngine: z
        .enum(['1', '2'])
        .optional()
        .default('1')
        .describe(
          'OCR engine to use: "1" (fastest) or "2" (complex backgrounds). Engine 3 is not supported for PDF generation.'
        ),
      hideTextLayer: z
        .boolean()
        .optional()
        .default(false)
        .describe('Hide the text layer in the output PDF (text is present but not visible)'),
      detectOrientation: z
        .boolean()
        .optional()
        .default(false)
        .describe('Auto-rotate the image before processing'),
      scale: z
        .boolean()
        .optional()
        .default(false)
        .describe('Upscale low-resolution images to improve OCR results')
    })
  )
  .output(
    z.object({
      searchablePdfUrl: z
        .string()
        .describe(
          'Temporary OCR.space download URL used to fetch the attached searchable PDF (valid for 1 hour)'
        ),
      mimeType: z.string().describe('MIME type of the returned PDF attachment'),
      byteLength: z.number().describe('Decoded byte length of the returned PDF attachment'),
      attachmentCount: z.number().describe('Number of Slate attachments returned'),
      extractedText: z.string().describe('Full extracted text from all pages'),
      pages: z
        .array(
          z.object({
            pageNumber: z.number().describe('Page number (1-indexed)'),
            text: z.string().describe('Extracted text for this page')
          })
        )
        .describe('Per-page OCR results'),
      processingTimeMs: z.number().describe('Processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    validateSingleSource(ctx.input);
    validateLanguageForEngine(ctx.input.language, ctx.input.ocrEngine);

    let client = new Client({ token: ctx.auth.token });

    ctx.info('Generating searchable PDF...');

    let result = await client.parseImage({
      url: ctx.input.sourceUrl,
      base64Image: ctx.input.base64Image,
      language: ctx.input.language,
      ocrEngine: Number(ctx.input.ocrEngine) as 1 | 2,
      isCreateSearchablePdf: true,
      isSearchablePdfHideTextLayer: ctx.input.hideTextLayer,
      detectOrientation: ctx.input.detectOrientation,
      scale: ctx.input.scale
    });

    if (!result.searchablePdfUrl) {
      throw ocrspaceServiceError(
        'Searchable PDF generation failed — no download URL was returned. Ensure you are not using Engine 3.'
      );
    }

    let pdf = await client.downloadFile(result.searchablePdfUrl, 'application/pdf');

    let pages = result.parsedResults.map((r, i) => ({
      pageNumber: i + 1,
      text: r.parsedText || ''
    }));

    let extractedText = pages.map(p => p.text).join('\n\n');

    return {
      output: {
        searchablePdfUrl: result.searchablePdfUrl,
        mimeType: pdf.mimeType,
        byteLength: pdf.byteLength,
        attachmentCount: 1,
        extractedText,
        pages,
        processingTimeMs: result.processingTimeInMilliseconds
      },
      attachments: [createBase64Attachment(pdf.contentBase64, pdf.mimeType)],
      message: `Searchable PDF generated and returned as an attachment in ${result.processingTimeInMilliseconds}ms with ${pages.length} page(s).`
    };
  })
  .build();
