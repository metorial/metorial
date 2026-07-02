import { SlateTool } from 'slates';
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
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    switch (ctx.input.conversionType) {
      case 'file_to_pdf':
        result = await client.convertFileToPdf({
          fileName: ctx.input.fileName,
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output',
          pdfaCompliance: ctx.input.pdfaCompliance || false,
          pdfaComplianceLevel: ctx.input.pdfaComplianceLevel || 'PDF_A_2A'
        });
        break;

      case 'html_to_pdf':
        result = await client.convertHtmlToPdf({
          htmlContent: ctx.input.htmlContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'html_to_word':
        result = await client.convertHtmlToWord({
          htmlContent: ctx.input.htmlContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'html_to_image':
        result = await client.convertHtmlToImage({
          htmlContent: ctx.input.htmlContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'pdf_to_word':
        result = await client.convertPdfToWord({
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'pdf_to_excel':
        result = await client.convertPdfToExcel({
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;

      case 'pdf_to_images':
        result = await client.convertPdfToImages({
          fileContent: ctx.input.fileContent
        });
        break;

      case 'pdf_to_pdfa':
        result = await client.convertPdfToPdfa({
          fileContent: ctx.input.fileContent,
          outputFilename: ctx.input.outputFilename || 'output',
          pdfaComplianceLevel: ctx.input.pdfaComplianceLevel || 'PDF_A_2A'
        });
        break;

      case 'convert_word':
        result = await client.convertWord(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: ctx.input.outputFormat || 'PDF'
          },
          ctx.input.outputFormat || 'PDF'
        );
        break;

      case 'convert_excel':
        result = await client.convertExcel(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: ctx.input.outputFormat || 'PDF'
          },
          ctx.input.outputFormat || 'PDF'
        );
        break;

      case 'convert_powerpoint':
        result = await client.convertPowerPoint(
          {
            fileName: ctx.input.fileName,
            fileContent: ctx.input.fileContent,
            outputFilename: ctx.input.outputFilename || 'output',
            outputFormat: ctx.input.outputFormat || 'PDF'
          },
          ctx.input.outputFormat || 'PDF'
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
          text: ctx.input.textContent,
          outputFilename: ctx.input.outputFilename || 'output'
        });
        break;
    }

    return {
      output: {
        fileName: result.Filename || result.filename || '',
        fileContent: result.FileContent || result.fileContent || '',
        operationId: result.OperationId || ''
      },
      message: `Successfully converted document using **${ctx.input.conversionType}**. Output file: **${result.Filename || result.filename || 'output'}**`
    };
  })
  .build();
