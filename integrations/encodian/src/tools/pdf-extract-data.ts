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
      operationStatus: z.string().describe('Encodian operation status'),
      statusUrl: z.string().optional().describe('Status URL for a queued operation'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));
    let result: any;
    let outputData: any = {};

    switch (ctx.input.extractionType) {
      case 'text':
        result = await client.extractPdfText({
          FileName: 'input.pdf',
          FileContent: ctx.input.fileContent,
          FinalOperation: true
        });
        outputData.text = result.TextLayer ?? result.text ?? result.Text ?? '';
        break;

      case 'text_by_page':
        result = await client.extractPdfTextByPage({
          fileContent: ctx.input.fileContent
        });
        outputData.pages = (result.pages ?? result.Pages ?? []).map((page: any) => ({
          pageNumber: page.Number ?? page.pageNumber,
          text: page.Text ?? page.text ?? ''
        }));
        break;

      case 'form_data':
        result = await client.extractPdfFormData({
          FileName: 'input.pdf',
          FileContent: ctx.input.fileContent,
          FinalOperation: false
        });
        outputData.formFields =
          result['Form Data'] ?? result.formData ?? result.FormData ?? result;
        break;

      case 'table_data':
        result = await client.extractPdfTableData({
          fileContent: ctx.input.fileContent
        });
        outputData.tableData = result.result ?? result.tableData ?? result.TableData ?? result;
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

      case 'metadata': {
        result = await client.getPdfMetadata({
          FileName: 'input.pdf',
          fileContent: ctx.input.fileContent
        });
        outputData.pageCount = result.NumberOfPages ?? result.pageCount ?? result.PageCount;
        let fileSize = result.FileSize ?? result.fileSize;
        outputData.fileSize =
          fileSize === undefined || fileSize === null ? undefined : String(fileSize);
        outputData.metadata = result;
        break;
      }
    }

    outputData.operationId = result.OperationId || '';
    outputData.operationStatus = client.operationStatus;
    outputData.statusUrl = client.statusUrl;

    return {
      output: outputData,
      message: client.message(
        `Successfully extracted **${ctx.input.extractionType}** from PDF document.`
      )
    };
  })
  .build();
