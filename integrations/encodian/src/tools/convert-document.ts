import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertDocument = SlateTool.create(spec, {
  name: 'Convert Document',
  key: 'convert_document',
  description: `Convert files between formats including PDF, Word, Excel, PowerPoint, HTML, and images.
Supports converting any common document format to PDF, converting between Office formats, HTML/URL to PDF or image, PDF to Word/Excel/images, JSON to Excel, and plain text to PDF.`,
  instructions: [
    'Provide the file as base64-encoded content along with the source filename (including extension).',
    'For HTML to PDF/Word/Image conversions, you can pass HTML content or a URL directly.'
  ],
  constraints: ['Supported output formats depend on the source file type.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      conversionType: z
        .enum([
          'file_to_pdf',
          'html_to_pdf',
          'html_to_word',
          'html_to_image',
          'pdf_to_word',
          'pdf_to_excel',
          'pdf_to_images',
          'pdf_to_pdfa',
          'convert_word',
          'convert_excel',
          'convert_powerpoint',
          'json_to_excel',
          'text_to_pdf'
        ])
        .describe('The type of conversion to perform'),
      fileName: z
        .string()
        .optional()
        .describe('Source filename with extension (e.g., "report.docx")'),
      fileContent: z.string().optional().describe('Base64-encoded file content'),
      htmlContent: z
        .string()
        .optional()
        .describe('HTML content or URL for HTML-based conversions'),
      jsonContent: z.string().optional().describe('JSON string for JSON to Excel conversion'),
      textContent: z
        .string()
        .optional()
        .describe('Plain text content for text to PDF conversion'),
      outputFilename: z.string().optional().describe('Desired output filename'),
      outputFormat: z
        .string()
        .optional()
        .describe('Target output format (e.g., PDF, DOCX, XLSX, PNG, HTML, CSV, TIFF)'),
      pdfaCompliance: z
        .boolean()
        .optional()
        .describe('Enable PDF/A compliance for file-to-PDF conversion'),
      pdfaComplianceLevel: z
        .string()
        .optional()
        .describe('PDF/A compliance level (e.g., PDF_A_2A)')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded output file content'),
      operationStatus: z.string().describe('Encodian operation status'),
      statusUrl: z.string().optional().describe('Status URL for a queued operation'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));
    let result: any;
    let type = ctx.input.conversionType;
    if (type.startsWith('html_to_')) {
      if (!ctx.input.htmlContent?.trim() && !ctx.input.fileContent?.trim()) {
        throw createApiServiceError('Provide htmlContent or a base64 HTML fileContent.');
      }
      if (ctx.input.htmlContent && ctx.input.fileContent) {
        throw createApiServiceError('Provide only one of htmlContent and fileContent.');
      }
    } else if (type === 'json_to_excel') {
      if (!ctx.input.jsonContent?.trim()) {
        throw createApiServiceError('jsonContent is required for JSON to Excel conversion.');
      }
      try {
        JSON.parse(ctx.input.jsonContent);
      } catch {
        throw createApiServiceError('jsonContent must contain valid JSON.');
      }
    } else if (type === 'text_to_pdf') {
      if (ctx.input.textContent === undefined && !ctx.input.fileContent?.trim()) {
        throw createApiServiceError('Provide textContent or a base64 text fileContent.');
      }
    } else if (!ctx.input.fileContent?.trim()) {
      throw createApiServiceError('fileContent is required for this conversion.');
    }
    if (
      ['file_to_pdf', 'convert_word', 'convert_excel', 'convert_powerpoint'].includes(type) &&
      !ctx.input.fileName?.trim()
    ) {
      throw createApiServiceError(
        'fileName with its extension is required for this conversion.'
      );
    }
    let formats: Record<string, string[]> = {
      convert_word: [
        'PDF',
        'DOCX',
        'DOC',
        'DOTX',
        'RTF',
        'HTML',
        'TXT',
        'PNG',
        'TIFF',
        'DOCM'
      ],
      convert_excel: [
        'PDF',
        'HTML',
        'CSV',
        'TXT',
        'XLSX',
        'XLS',
        'XLTX',
        'PNG',
        'TIFF',
        'XLSB',
        'XLSM'
      ],
      convert_powerpoint: ['PDF', 'HTML', 'POTX', 'PPTX', 'TXT', 'PNG', 'TIFF'],
      pdf_to_images: ['JPG', 'PNG']
    };
    let format = ctx.input.outputFormat ?? (type === 'pdf_to_images' ? 'PNG' : 'PDF');
    if (formats[type] && !formats[type].includes(format)) {
      throw createApiServiceError(`outputFormat must be one of: ${formats[type].join(', ')}.`);
    }
    let htmlIsUrl = /^https?:\/\//i.test(ctx.input.htmlContent ?? '');
    let htmlBody = ctx.input.fileContent
      ? { fileContent: ctx.input.fileContent }
      : htmlIsUrl
        ? { Url: ctx.input.htmlContent }
        : { htmlData: ctx.input.htmlContent };

    switch (ctx.input.conversionType) {
      case 'file_to_pdf':
        result = await client.convertFileToPdf({
          FileName: ctx.input.fileName,
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output',
          pdfaCompliance: ctx.input.pdfaCompliance || false,
          pdfaComplianceLevel: ctx.input.pdfaComplianceLevel || 'PDF_A_2A'
        });
        break;

      case 'html_to_pdf':
        result = await client.convertHtmlToPdf({
          ...htmlBody
        });
        break;

      case 'html_to_word':
        result = await client.convertHtmlToWord({
          FileName: ctx.input.fileName || 'input.html',
          outputFilename: ctx.input.outputFilename || 'output.docx',
          FinalOperation: true,
          ...(htmlIsUrl ? { htmlUrl: ctx.input.htmlContent } : htmlBody)
        });
        break;

      case 'html_to_image':
        result = await client.convertHtmlToImage({
          ...htmlBody
        });
        break;

      case 'pdf_to_word':
        result = await client.convertPdfToWord({
          fileContent: ctx.input.fileContent,
          fileName: ctx.input.fileName || 'input.pdf',
          outputFilename: ctx.input.outputFilename || 'output.docx',
          finalOperation: true
        });
        break;

      case 'pdf_to_excel':
        result = await client.convertPdfToExcel({
          fileContent: ctx.input.fileContent
        });
        break;

      case 'pdf_to_images':
        result = await client.convertPdfToImages({
          fileContent: ctx.input.fileContent,
          imageFormat: format,
          filenamePrefix: ctx.input.outputFilename
        });
        break;

      case 'pdf_to_pdfa':
        result = await client.convertPdfToPdfa({
          fileContent: ctx.input.fileContent,
          FileName: ctx.input.fileName || 'input.pdf',
          FinalOperation: true,
          pdfaComplianceLevel: ctx.input.pdfaComplianceLevel || 'PDF_A_2A'
        });
        break;

      case 'convert_word':
        result = await client.convertWord(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: format
          },
          format
        );
        break;

      case 'convert_excel':
        result = await client.convertExcel(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: format
          },
          format
        );
        break;

      case 'convert_powerpoint':
        result = await client.convertPowerPoint(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: format
          },
          format
        );
        break;

      case 'json_to_excel':
        result = await client.convertJsonToExcel({
          jsonData: ctx.input.jsonContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'text_to_pdf':
        result = await client.convertTextToPdf({
          FileName: ctx.input.fileName || 'input.txt',
          textData: ctx.input.textContent,
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output.pdf',
          FinalOperation: true
        });
        break;
    }

    return {
      output: {
        fileName: result.Filename || result.filename || ctx.input.outputFilename || '',
        fileContent: result.FileContent || result.fileContent || '',
        operationStatus: client.operationStatus,
        statusUrl: client.statusUrl,
        operationId: result.OperationId || ''
      },
      message: client.message(
        `Successfully converted document using **${ctx.input.conversionType}**. Output file: **${result.Filename || result.filename || 'output'}**`
      )
    };
  })
  .build();
