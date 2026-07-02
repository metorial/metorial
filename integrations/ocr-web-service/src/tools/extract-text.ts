import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ocrWebServiceServiceError } from '../lib/errors';
import { spec } from '../spec';

let zoneSchema = z.object({
  top: z.number().describe('Top pixel coordinate of the zone'),
  left: z.number().describe('Left pixel coordinate of the zone'),
  height: z.number().describe('Height of the zone in pixels'),
  width: z.number().describe('Width of the zone in pixels')
});

let languageEnum = z.enum([
  'english',
  'afrikaans',
  'albanian',
  'basque',
  'brazilian',
  'bulgarian',
  'byelorussian',
  'catalan',
  'chinesesimplified',
  'chinesetraditional',
  'croatian',
  'czech',
  'danish',
  'dutch',
  'esperanto',
  'estonian',
  'finnish',
  'french',
  'galician',
  'german',
  'greek',
  'hungarian',
  'icelandic',
  'indonesian',
  'italian',
  'japanese',
  'korean',
  'latin',
  'latvian',
  'lithuanian',
  'macedonian',
  'malay',
  'moldavian',
  'norwegian',
  'polish',
  'portuguese',
  'romanian',
  'russian',
  'serbian',
  'slovak',
  'slovenian',
  'spanish',
  'swedish',
  'tagalog',
  'turkish',
  'ukrainian'
]);

export let extractText = SlateTool.create(spec, {
  name: 'Extract Text',
  key: 'extract_text',
  description: `Extracts text from a scanned document or image using OCR. Supports 46 recognition languages and can process specific page ranges from multi-page documents. Optionally define rectangular zones to extract text from specific regions of the document. Provide either base64-encoded file content or a publicly accessible file URL that Slates can download and upload to OCR Web Service.`,
  instructions: [
    'Provide either fileContent (base64) with fileName, or fileUrl - not both.',
    'For multi-language documents, specify multiple languages in the languages array.',
    'Use zones for targeted text extraction from specific regions of the document.'
  ],
  constraints: [
    'Maximum input file size is 100 MB.',
    'Recommended input resolution is 200–400 DPI.',
    'Supported file types: PDF, TIFF, JPEG, BMP, PCX, PNG, GIF, and ZIP archives.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded file content of the document or image to process'),
      fileName: z
        .string()
        .optional()
        .describe(
          'Name of the file including extension (e.g., "document.pdf"). Required when providing fileContent.'
        ),
      fileUrl: z
        .string()
        .url()
        .optional()
        .describe(
          'Publicly accessible URL of the document or image to process. Slates downloads this URL and uploads the file bytes to OCR Web Service.'
        ),
      languages: z
        .array(languageEnum)
        .optional()
        .default(['english'])
        .describe('Recognition languages to use for OCR'),
      pageRange: z
        .string()
        .optional()
        .describe('Pages to process, e.g. "1,3,5-12" or "allpages". Defaults to all pages.'),
      convertToBlackWhite: z
        .boolean()
        .optional()
        .describe('Convert color images to black and white for improved recognition accuracy'),
      zones: z
        .array(zoneSchema)
        .optional()
        .describe(
          'Rectangular regions to extract text from (pixel coordinates relative to top-left corner). If not specified, the entire page is processed.'
        ),
      includeNewlines: z
        .boolean()
        .optional()
        .describe('Include newline characters in extracted text output'),
      includeWordCoordinates: z
        .boolean()
        .optional()
        .describe('Return coordinates of each recognized word')
    })
  )
  .output(
    z.object({
      ocrText: z
        .array(z.array(z.string()))
        .describe(
          'Extracted text organized as a two-dimensional array: first dimension is zones, second dimension is pages'
        ),
      processedPages: z.number().describe('Number of pages processed'),
      availablePages: z.number().describe('Remaining page balance on the account'),
      wordCoordinates: z
        .array(z.unknown())
        .optional()
        .describe(
          'Provider word-coordinate payload returned when includeWordCoordinates is true'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      username: ctx.auth.username,
      licenseCode: ctx.auth.licenseCode
    });

    let hasFile = !!ctx.input.fileContent;
    let hasUrl = !!ctx.input.fileUrl;

    if (!hasFile && !hasUrl) {
      throw ocrWebServiceServiceError('Either fileContent or fileUrl must be provided.');
    }

    if (hasFile && hasUrl) {
      throw ocrWebServiceServiceError('Provide either fileContent or fileUrl, not both.');
    }

    if (hasFile && !ctx.input.fileName) {
      throw ocrWebServiceServiceError('fileName is required when providing fileContent.');
    }

    let params = {
      language: ctx.input.languages,
      pageRange: ctx.input.pageRange,
      convertToBlackWhite: ctx.input.convertToBlackWhite,
      zones: ctx.input.zones,
      getText: true,
      getWords: ctx.input.includeWordCoordinates,
      newline: ctx.input.includeNewlines
    };

    ctx.progress('Processing document with OCR...');

    let result = hasFile
      ? await client.processDocument(ctx.input.fileContent!, ctx.input.fileName!, params)
      : await client.processDocumentFromUrl(ctx.input.fileUrl!, ctx.input.fileName, params);

    let textPreview = (result.OCRText || []).flat().join(' ').substring(0, 200);
    let wordCoordinates =
      result.OCRWords ??
      result.OCRWSWords ??
      (ctx.input.includeWordCoordinates ? result.Reserved : undefined);

    return {
      output: {
        ocrText: result.OCRText || [],
        processedPages: result.ProcessedPages,
        availablePages: result.AvailablePages,
        ...(Array.isArray(wordCoordinates) ? { wordCoordinates } : {})
      },
      message: `Successfully extracted text from **${result.ProcessedPages}** page(s). Preview: "${textPreview}${textPreview.length >= 200 ? '...' : ''}"`
    };
  })
  .build();
