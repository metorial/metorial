import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let wordOperations = SlateTool.create(spec, {
  name: 'Word Document Operations',
  key: 'word_operations',
  description: `Perform operations on Word documents including merging multiple documents, search and replace text, extracting text content, adding watermarks, adding headers/footers, and applying/removing password protection.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'merge',
          'search_replace',
          'extract_text',
          'add_text_watermark',
          'add_image_watermark',
          'add_header_footer',
          'secure',
          'unlock'
        ])
        .describe('Word document operation to perform'),
      // File content
      fileContent: z.string().optional().describe('Base64-encoded Word document content'),
      fileName: z.string().optional().describe('Filename with extension'),
      // Merge
      documents: z
        .array(
          z.object({
            fileName: z.string().describe('Filename with extension'),
            fileContent: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('Array of Word documents to merge'),
      outputFilename: z.string().optional().describe('Desired output filename'),
      // Search & replace
      searchText: z.string().optional().describe('Text to search for'),
      replaceText: z.string().optional().describe('Replacement text'),
      // Text extraction
      startPage: z.number().optional().describe('Start page for text extraction'),
      endPage: z.number().optional().describe('End page for text extraction'),
      // Watermark
      watermarkText: z.string().optional().describe('Text for watermark'),
      watermarkImageContent: z.string().optional().describe('Base64-encoded watermark image'),
      watermarkImageFilename: z.string().optional().describe('Watermark image filename'),
      // Header/footer
      headerHtml: z.string().optional().describe('HTML content for header'),
      footerHtml: z.string().optional().describe('HTML content for footer'),
      // Security
      password: z.string().optional().describe('Password for protection/unlocking')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output filename'),
      fileContent: z.string().optional().describe('Base64-encoded output file'),
      text: z.string().optional().describe('Extracted text (for extract_text operation)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    switch (ctx.input.operation) {
      case 'merge':
        result = await client.mergeWordDocuments({
          outputFilename: ctx.input.outputFilename || 'merged',
          documents: ctx.input.documents,
          FinalOperation: true
        });
        return {
          output: {
            fileName: result.Filename,
            fileContent: result.FileContent,
            operationId: result.OperationId
          },
          message: `Merged **${ctx.input.documents?.length || 0} documents** into **${result.Filename}**`
        };

      case 'search_replace':
        result = await client.wordSearchAndReplace({
          fileContent: ctx.input.fileContent,
          searchText: ctx.input.searchText,
          replaceText: ctx.input.replaceText || ''
        });
        break;

      case 'extract_text':
        result = await client.extractTextFromWord({
          fileContent: ctx.input.fileContent,
          startPage: ctx.input.startPage,
          endPage: ctx.input.endPage
        });
        return {
          output: {
            text: result.text || result.Text || '',
            operationId: result.OperationId || ''
          },
          message: `Successfully extracted text from Word document.`
        };

      case 'add_text_watermark':
        result = await client.addTextWatermarkToWord({
          fileName: ctx.input.fileName || 'document.docx',
          fileContent: ctx.input.fileContent,
          text: ctx.input.watermarkText
        });
        break;

      case 'add_image_watermark':
        result = await client.addImageWatermarkToWord({
          fileName: ctx.input.fileName || 'document.docx',
          fileContent: ctx.input.fileContent,
          watermarkFilename: ctx.input.watermarkImageFilename || 'watermark.png',
          watermarkFileContent: ctx.input.watermarkImageContent
        });
        break;

      case 'add_header_footer':
        result = await client.addHtmlHeaderFooterToWord({
          fileContent: ctx.input.fileContent,
          allPagesHeaderHtml: ctx.input.headerHtml,
          allPagesFooterHtml: ctx.input.footerHtml
        });
        break;

      case 'secure':
        result = await client.secureWordDocument({
          fileContent: ctx.input.fileContent,
          password: ctx.input.password
        });
        break;

      case 'unlock':
        result = await client.unlockWordDocument({
          fileContent: ctx.input.fileContent,
          password: ctx.input.password
        });
        break;
    }

    return {
      output: {
        fileName: result.Filename || '',
        fileContent: result.FileContent || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully performed **${ctx.input.operation.replace(/_/g, ' ')}** on Word document.`
    };
  })
  .build();
