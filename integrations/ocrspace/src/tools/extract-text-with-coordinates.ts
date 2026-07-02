import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { languageEnum, validateLanguageForEngine, validateSingleSource } from './shared';

let wordSchema = z.object({
  wordText: z.string().describe('Recognized text of the word'),
  left: z.number().describe('X position in pixels from the left edge'),
  top: z.number().describe('Y position in pixels from the top edge'),
  height: z.number().describe('Height of the word bounding box in pixels'),
  width: z.number().describe('Width of the word bounding box in pixels')
});

let lineSchema = z.object({
  words: z.array(wordSchema).describe('Words in this line with their bounding boxes'),
  maxHeight: z.number().describe('Maximum height of any word in this line'),
  minTop: z.number().describe('Minimum top position of any word in this line')
});

export let extractTextWithCoordinates = SlateTool.create(spec, {
  name: 'Extract Text with Coordinates',
  key: 'extract_text_with_coordinates',
  description: `Extracts text from an image or PDF with **word-level bounding box coordinates** (position, height, width) for each recognized word, organized by lines.

Useful for overlaying recognized text on the original image, building text annotation tools, or extracting text from specific regions.`,
  instructions: [
    'Provide exactly one of "sourceUrl" or "base64Image" as the input source.',
    'For Base64 input, include the content-type prefix, e.g. "data:image/png;base64,iVBOR...".',
    'Coordinates are in pixels relative to the original image dimensions.'
  ],
  constraints: [
    'Free tier: max 1 MB file size, max 3 PDF pages.',
    'Engine 3 overlay coordinates are available but less precise than Engine 1/2 and slower when requested.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().optional().describe('URL of the image or PDF to process'),
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
        .enum(['1', '2', '3'])
        .optional()
        .default('1')
        .describe(
          'OCR engine to use: "1" (fastest), "2" (complex backgrounds), or "3" (best text quality with slower overlay data)'
        ),
      detectOrientation: z
        .boolean()
        .optional()
        .default(false)
        .describe('Auto-rotate the image and report detected orientation'),
      scale: z
        .boolean()
        .optional()
        .default(false)
        .describe('Upscale low-resolution images to improve OCR results'),
      isTable: z
        .boolean()
        .optional()
        .default(false)
        .describe('Optimize for table-structured documents with line-by-line output')
    })
  )
  .output(
    z.object({
      extractedText: z.string().describe('Full extracted text from all pages combined'),
      pages: z
        .array(
          z.object({
            pageNumber: z.number().describe('Page number (1-indexed)'),
            text: z.string().describe('Extracted text for this page'),
            lines: z
              .array(lineSchema)
              .describe('Lines of text with word-level bounding box coordinates'),
            hasOverlay: z.boolean().describe('Whether overlay data is available for this page')
          })
        )
        .describe('Per-page OCR results with word coordinates'),
      processingTimeMs: z.number().describe('Processing time in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    validateSingleSource(ctx.input);
    validateLanguageForEngine(ctx.input.language, ctx.input.ocrEngine);

    let client = new Client({ token: ctx.auth.token });

    ctx.info('Extracting text with word coordinates...');

    let result = await client.parseImage({
      url: ctx.input.sourceUrl,
      base64Image: ctx.input.base64Image,
      language: ctx.input.language,
      ocrEngine: Number(ctx.input.ocrEngine) as 1 | 2 | 3,
      isOverlayRequired: true,
      detectOrientation: ctx.input.detectOrientation,
      scale: ctx.input.scale,
      isTable: ctx.input.isTable
    });

    let pages = result.parsedResults.map((r, i) => ({
      pageNumber: i + 1,
      text: r.parsedText || '',
      lines: r.textOverlay?.lines || [],
      hasOverlay: r.textOverlay?.hasOverlay ?? false
    }));

    let extractedText = pages.map(p => p.text).join('\n\n');
    let totalWords = pages.reduce(
      (sum, p) => sum + p.lines.reduce((lsum, l) => lsum + l.words.length, 0),
      0
    );

    return {
      output: {
        extractedText,
        pages,
        processingTimeMs: result.processingTimeInMilliseconds
      },
      message: `Extracted ${totalWords} words with coordinates from ${pages.length} page(s) in ${result.processingTimeInMilliseconds}ms.`
    };
  })
  .build();
