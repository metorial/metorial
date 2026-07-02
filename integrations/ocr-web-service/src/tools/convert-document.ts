import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { ocrWebServiceServiceError } from '../lib/errors';
import { spec } from '../spec';

let outputFormatEnum = z.enum(['pdf', 'pdfimg', 'doc', 'docx', 'xls', 'xlsx', 'rtf', 'txt']);

let mimeTypeForOutputFormat = (format: z.infer<typeof outputFormatEnum>) => {
  switch (format) {
    case 'pdf':
    case 'pdfimg':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'rtf':
      return 'application/rtf';
    case 'txt':
      return 'text/plain';
  }
};

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
  description: `Converts a scanned document or image into an editable document format using OCR. Returns converted files as Slate attachments with provider download URLs in metadata. Supports output formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx), RTF, and plain text. You can request up to two output formats per conversion. Optionally also returns extracted text alongside the converted file.`,
  instructions: [
    'Provide either fileContent (base64) with fileName, or fileUrl - not both.',
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
        .url()
        .optional()
        .describe(
          'Publicly accessible URL of the document or image to process. Slates downloads this URL and uploads the file bytes to OCR Web Service.'
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
          'Also return extracted text in the response alongside the converted file attachment metadata'
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
        .describe(
          'Extracted text organized as zones by pages (only included if includeText was set to true)'
        ),
      processedPages: z.number().describe('Number of pages processed'),
      availablePages: z.number().describe('Remaining page balance on the account'),
      files: z
        .array(
          z.object({
            outputFormat: outputFormatEnum.describe('Requested output format'),
            outputFileUrl: z
              .string()
              .describe('Temporary OCR Web Service download URL for this output file'),
            mimeType: z.string().describe('MIME type of the returned attachment'),
            byteLength: z.number().describe('Decoded byte length of the attachment')
          })
        )
        .describe('Converted file metadata in the same order as returned attachments'),
      attachmentCount: z.number().describe('Number of Slate attachments returned')
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
      outputFormats: ctx.input.outputFormats,
      getText: ctx.input.includeText
    };

    ctx.progress('Converting document...');

    let result = hasFile
      ? await client.processDocument(ctx.input.fileContent!, ctx.input.fileName!, params)
      : await client.processDocumentFromUrl(ctx.input.fileUrl!, ctx.input.fileName, params);

    let outputFileUrls = [result.OutputFileUrl, result.OutputFileUrl2].filter(
      (url): url is string => typeof url === 'string' && url.length > 0
    );

    if (outputFileUrls.length < ctx.input.outputFormats.length) {
      throw ocrWebServiceServiceError(
        'OCR Web Service did not return a download URL for every requested output format.'
      );
    }

    let downloadedFiles = await Promise.all(
      outputFileUrls.map((url, index) =>
        client.downloadOutputFile(
          url,
          mimeTypeForOutputFormat(ctx.input.outputFormats[index]!)
        )
      )
    );

    let files = downloadedFiles.map((file, index) => {
      let outputFormat = ctx.input.outputFormats[index]!;
      let fallbackMimeType = mimeTypeForOutputFormat(outputFormat);
      let mimeType =
        file.mimeType === 'application/octet-stream' ? fallbackMimeType : file.mimeType;

      return {
        outputFormat,
        outputFileUrl: outputFileUrls[index]!,
        mimeType,
        byteLength: file.byteLength
      };
    });

    let output: {
      outputFileUrl: string;
      outputFileUrl2?: string;
      ocrText?: string[][];
      processedPages: number;
      availablePages: number;
      files: typeof files;
      attachmentCount: number;
    } = {
      outputFileUrl: outputFileUrls[0]!,
      processedPages: result.ProcessedPages,
      availablePages: result.AvailablePages,
      files,
      attachmentCount: downloadedFiles.length
    };

    if (outputFileUrls[1]) {
      output.outputFileUrl2 = outputFileUrls[1];
    }

    if (ctx.input.includeText && result.OCRText) {
      output.ocrText = result.OCRText;
    }

    let formatNames = ctx.input.outputFormats.join(', ').toUpperCase();

    return {
      output,
      attachments: downloadedFiles.map((file, index) =>
        createBase64Attachment(file.contentBase64, files[index]?.mimeType)
      ),
      message: `Successfully converted **${result.ProcessedPages}** page(s) to **${formatNames}** and returned ${downloadedFiles.length} attachment(s). [Download file](${outputFileUrls[0]})${outputFileUrls[1] ? ` | [Download file 2](${outputFileUrls[1]})` : ''}`
    };
  })
  .build();
