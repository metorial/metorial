import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfManipulate = SlateTool.create(spec, {
  name: 'PDF Manipulate',
  key: 'pdf_manipulate',
  description: `Perform various operations on PDF documents including compression, watermarking, page numbering, header/footer insertion, flattening, redaction, text replacement, page rotation, page extraction/deletion, and security (encrypt/unlock).
Choose the desired operation and provide the PDF file content along with operation-specific parameters.`,
  instructions: [
    'Provide the PDF file as base64-encoded content.',
    'For watermark operations, specify text or provide image content.',
    'For page operations, specify page numbers or ranges.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum([
          'compress',
          'add_text_watermark',
          'add_image_watermark',
          'add_page_numbers',
          'add_header_footer',
          'flatten',
          'redact',
          'search_replace_text',
          'rotate_pages',
          'extract_pages',
          'delete_pages',
          'secure',
          'unlock',
          'insert_html'
        ])
        .describe('The PDF manipulation operation to perform'),
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      outputFilename: z.string().optional().describe('Desired output filename'),
      // Watermark params
      watermarkText: z.string().optional().describe('Text for text watermark'),
      watermarkPosition: z
        .string()
        .optional()
        .describe(
          'Watermark position (e.g., Diagonal, TopLeft, BottomRight, CentreHorizontal)'
        ),
      watermarkImageContent: z
        .string()
        .optional()
        .describe('Base64-encoded image for image watermark'),
      watermarkOpacity: z.number().optional().describe('Watermark opacity (0.0 to 1.0)'),
      // Page number params
      pageNumberPosition: z
        .string()
        .optional()
        .describe('Position for page numbers (e.g., BottomCenter, BottomLeft, BottomRight)'),
      pageNumberFormat: z.string().optional().describe('Page number format string'),
      // Header/footer params
      headerHtml: z.string().optional().describe('HTML content for header'),
      footerHtml: z.string().optional().describe('HTML content for footer'),
      // Text replacement params
      searchText: z
        .string()
        .optional()
        .describe('Text to search for (for search/replace and redact)'),
      replaceText: z.string().optional().describe('Replacement text'),
      // Page operation params
      pages: z.string().optional().describe('Page numbers or ranges (e.g., "1-3,5,7-10")'),
      rotationAngle: z
        .number()
        .optional()
        .describe('Rotation angle in degrees (90, 180, 270)'),
      // Security params
      password: z.string().optional().describe('Password for security/unlock operations'),
      ownerPassword: z.string().optional().describe('Owner password for PDF security'),
      // HTML insertion params
      htmlContent: z.string().optional().describe('HTML content to insert into the PDF')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded output PDF content'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;
    let operationLabel = ctx.input.operation.replace(/_/g, ' ');

    switch (ctx.input.operation) {
      case 'compress':
        result = await client.compressPdf({
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'compressed'
        });
        break;

      case 'add_text_watermark':
        result = await client.addTextWatermarkToPdf({
          fileContent: ctx.input.fileContent,
          text: ctx.input.watermarkText,
          watermarkPosition: ctx.input.watermarkPosition || 'Diagonal',
          opacity: ctx.input.watermarkOpacity || 0.5
        });
        break;

      case 'add_image_watermark':
        result = await client.addImageWatermarkToPdf({
          fileContent: ctx.input.fileContent,
          watermarkFileContent: ctx.input.watermarkImageContent,
          watermarkPosition: ctx.input.watermarkPosition || 'Diagonal',
          opacity: ctx.input.watermarkOpacity || 0.5
        });
        break;

      case 'add_page_numbers':
        result = await client.addPageNumbersToPdf({
          fileContent: ctx.input.fileContent,
          pageNumberPosition: ctx.input.pageNumberPosition || 'BottomCenter',
          pageNumberFormat: ctx.input.pageNumberFormat
        });
        break;

      case 'add_header_footer':
        result = await client.addHtmlHeaderFooterToPdf({
          fileContent: ctx.input.fileContent,
          allPagesHeaderHtml: ctx.input.headerHtml,
          allPagesFooterHtml: ctx.input.footerHtml
        });
        break;

      case 'flatten':
        result = await client.flattenPdf({
          fileContent: ctx.input.fileContent
        });
        break;

      case 'redact':
        result = await client.redactPdf({
          fileContent: ctx.input.fileContent,
          searchText: ctx.input.searchText
        });
        break;

      case 'search_replace_text':
        result = await client.searchAndReplacePdfText({
          fileContent: ctx.input.fileContent,
          searchText: ctx.input.searchText,
          replaceText: ctx.input.replaceText || ''
        });
        break;

      case 'rotate_pages':
        result = await client.rotatePdfPages({
          fileContent: ctx.input.fileContent,
          pages: ctx.input.pages,
          rotationAngle: ctx.input.rotationAngle || 90
        });
        break;

      case 'extract_pages':
        result = await client.extractPdfPages({
          fileContent: ctx.input.fileContent,
          pages: ctx.input.pages
        });
        break;

      case 'delete_pages':
        result = await client.deletePdfPages({
          fileContent: ctx.input.fileContent,
          pages: ctx.input.pages
        });
        break;

      case 'secure':
        result = await client.securePdf({
          fileContent: ctx.input.fileContent,
          password: ctx.input.password,
          ownerPassword: ctx.input.ownerPassword || ctx.input.password
        });
        break;

      case 'unlock':
        result = await client.unlockPdf({
          fileContent: ctx.input.fileContent,
          password: ctx.input.password
        });
        break;

      case 'insert_html':
        result = await client.insertHtmlToPdf({
          fileContent: ctx.input.fileContent,
          htmlContent: ctx.input.htmlContent
        });
        break;
    }

    return {
      output: {
        fileName: result.Filename || '',
        fileContent: result.FileContent || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully performed **${operationLabel}** on PDF. Output: **${result.Filename || 'output.pdf'}**`
    };
  })
  .build();
