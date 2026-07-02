import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfExtractData = SlateTool.create(spec, {
  name: 'PDF Extract Data',
  key: 'pdf_extract_data',
  description: `Extract data from PDF documents including text content, form field values, table data, images, metadata, and hyperlinks.
Supports extracting the full text layer, text by page, structured form data, tabular data, embedded images, and document metadata (page count, file size, etc.).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      extractionType: z
        .enum(['text', 'text_by_page', 'form_data', 'table_data', 'images', 'metadata'])
        .describe('Type of data to extract from the PDF'),
      fileContent: z.string().describe('Base64-encoded PDF file content')
    })
  )
  .output(
    z.object({
      text: z.string().optional().describe('Extracted text content'),
      pages: z
        .array(
          z.object({
            pageNumber: z.number().describe('Page number'),
            text: z.string().describe('Text content of the page')
          })
        )
        .optional()
        .describe('Text extracted by page'),
      formFields: z.any().optional().describe('Extracted form field data'),
      tableData: z.any().optional().describe('Extracted table data'),
      images: z
        .array(
          z.object({
            fileName: z.string().describe('Image filename'),
            fileContent: z.string().describe('Base64-encoded image content')
          })
        )
        .optional()
        .describe('Extracted images'),
      pageCount: z.number().optional().describe('Total page count'),
      fileSize: z.string().optional().describe('File size'),
      metadata: z.any().optional().describe('Document metadata'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;
    let outputData: any = {};

    switch (ctx.input.extractionType) {
      case 'text':
        result = await client.extractPdfText({
          fileContent: ctx.input.fileContent
        });
        outputData.text = result.text || result.Text || '';
        break;

      case 'text_by_page':
        result = await client.extractPdfTextByPage({
          fileContent: ctx.input.fileContent
        });
        outputData.pages = result.pages || result.Pages || [];
        break;

      case 'form_data':
        result = await client.extractPdfFormData({
          fileContent: ctx.input.fileContent
        });
        outputData.formFields = result.formData || result.FormData || result;
        break;

      case 'table_data':
        result = await client.extractPdfTableData({
          fileContent: ctx.input.fileContent
        });
        outputData.tableData = result.tableData || result.TableData || result;
        break;

      case 'images':
        result = await client.extractPdfImages({
          fileContent: ctx.input.fileContent
        });
        outputData.images = (result.documents || result.Images || []).map((img: any) => ({
          fileName: img.fileName || img.Filename || '',
          fileContent: img.fileContent || img.FileContent || ''
        }));
        break;

      case 'metadata':
        result = await client.getPdfMetadata({
          fileContent: ctx.input.fileContent
        });
        outputData.pageCount = result.pageCount || result.PageCount;
        outputData.fileSize = result.fileSize || result.FileSize;
        outputData.metadata = result;
        break;
    }

    outputData.operationId = result.OperationId || '';

    return {
      output: outputData,
      message: `Successfully extracted **${ctx.input.extractionType}** from PDF document.`
    };
  })
  .build();
