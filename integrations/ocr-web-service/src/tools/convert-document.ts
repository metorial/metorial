import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let outputFormatEnum = z.enum(['pdf', 'pdfimg', 'doc', 'docx', 'xls', 'xlsx', 'rtf', 'txt']);

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

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Converts a scanned document or image into an editable document format using OCR. Returns a download URL for the converted file. Supports output formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), RTF, and plain text. You can request up to two output formats per conversion. Optionally also returns extracted text alongside the converted file.`,
  instructions: [
    'Provide either fileContent (base64) with fileName, or fileUrl — not both.',
    'You can specify up to 2 output formats per request.',
    'Use "pdfimg" for a PDF that includes both the original image and the recognized text layer.'
  ],
  constraints: [
    'Maximum input file size is 100 MB.',
    'Maximum of 2 output formats per request.',
    'Supported input file types: PDF, TIFF, JPEG, BMP, PCX, PNG, GIF, and ZIP archives.'
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
          'Name of the file including extension (e.g., "scan.tiff"). Required when providing fileContent.'
        ),
      fileUrl: z
        .string()
        .optional()
        .describe(
          'Publicly accessible URL of the document or image to process. Use this instead of fileContent.'
        ),
      outputFormats: z
        .array(outputFormatEnum)
        .min(1)
        .max(2)
        .describe(
          'Output format(s) for the converted document. Max 2. Options: pdf, pdfimg, doc, docx, xls, xlsx, rtf, txt'
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
      includeText: z
        .boolean()
        .optional()
        .describe(
          'Also return extracted text in the response alongside the converted file URL'
        )
    })
  )
  .output(
    z.object({
      outputFileUrl: z.string().describe('Download URL for the first converted output file'),
      outputFileUrl2: z
        .string()
        .optional()
        .describe(
          'Download URL for the second converted output file, if two formats were requested'
        ),
      ocrText: z
        .array(z.array(z.string()))
        .optional()
        .describe('Extracted text (only included if includeText was set to true)'),
      processedPages: z.number().describe('Number of pages processed'),
      availablePages: z.number().describe('Remaining page balance on the account')
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
      throw new Error('Either fileContent or fileUrl must be provided.');
    }

    if (hasFile && hasUrl) {
      throw new Error('Provide either fileContent or fileUrl, not both.');
    }

    if (hasFile && !ctx.input.fileName) {
      throw new Error('fileName is required when providing fileContent.');
    }

    let params = {
      language: ctx.input.languages,
      pageRange: ctx.input.pageRange,
      convertToBlackWhite: ctx.input.convertToBlackWhite,
      outputFormats: ctx.input.outputFormats,
      getText: ctx.input.includeText
    };

    ctx.progress('Converting document...');

    let result = hasFile
      ? await client.processDocument(ctx.input.fileContent!, ctx.input.fileName!, params)
      : await client.processDocumentFromUrl(ctx.input.fileUrl!, params);

    let output: {
      outputFileUrl: string;
      outputFileUrl2?: string;
      ocrText?: string[][];
      processedPages: number;
      availablePages: number;
    } = {
      outputFileUrl: result.OutputFileUrl,
      processedPages: result.ProcessedPages,
      availablePages: result.AvailablePages
    };

    if (result.OutputFileUrl2) {
      output.outputFileUrl2 = result.OutputFileUrl2;
    }

    if (ctx.input.includeText && result.OCRText) {
      output.ocrText = result.OCRText;
    }

    let formatNames = ctx.input.outputFormats.join(', ').toUpperCase();

    return {
      output,
      message: `Successfully converted **${result.ProcessedPages}** page(s) to **${formatNames}**. [Download file](${result.OutputFileUrl})${result.OutputFileUrl2 ? ` | [Download file 2](${result.OutputFileUrl2})` : ''}`
    };
  })
  .build();
