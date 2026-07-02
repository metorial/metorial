import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let excelOperations = SlateTool.create(spec, {
  name: 'Excel Operations',
  key: 'excel_operations',
  description: `Perform operations on Excel workbooks including extracting rows, merging files, replacing text, and managing security. Supports reading structured data from worksheets and combining multiple workbooks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['extract_rows', 'merge', 'replace_text', 'secure', 'unlock'])
        .describe('Excel operation to perform'),
      fileContent: z.string().optional().describe('Base64-encoded Excel file content'),
      // Extract rows
      worksheetName: z.string().optional().describe('Target worksheet name'),
      hasHeaderRow: z.boolean().optional().describe('Whether the first row is a header'),
      firstRow: z.number().optional().describe('First row to extract'),
      lastRow: z.number().optional().describe('Last row to extract'),
      excludeEmptyRows: z.boolean().optional().describe('Exclude empty rows from extraction'),
      // Merge
      documents: z
        .array(
          z.object({
            fileName: z.string().describe('Filename with extension'),
            fileContent: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('Array of Excel files to merge'),
      outputFilename: z.string().optional().describe('Desired output filename'),
      outputFormat: z.string().optional().describe('Output format for merge (XLSX, PDF, CSV)'),
      // Replace text
      phrases: z
        .array(
          z.object({
            searchText: z.string().describe('Text to search for'),
            replaceText: z.string().describe('Replacement text')
          })
        )
        .optional()
        .describe('Array of search/replace pairs'),
      // Security
      password: z.string().optional().describe('Password for protection/unlocking')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output filename'),
      fileContent: z.string().optional().describe('Base64-encoded output file'),
      rows: z.any().optional().describe('Extracted row data (for extract_rows operation)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    switch (ctx.input.operation) {
      case 'extract_rows':
        result = await client.getRowsFromExcel({
          fileContent: ctx.input.fileContent,
          worksheetName: ctx.input.worksheetName,
          hasHeaderRow: ctx.input.hasHeaderRow ?? true,
          firstRow: ctx.input.firstRow,
          lastRow: ctx.input.lastRow,
          excludeEmptyRows: ctx.input.excludeEmptyRows ?? true
        });
        return {
          output: {
            rows: result.rows || result.Rows || result,
            operationId: result.OperationId || ''
          },
          message: `Successfully extracted rows from Excel workbook.`
        };

      case 'merge':
        result = await client.mergeExcelFiles({
          documents: ctx.input.documents,
          outputFilename: ctx.input.outputFilename || 'merged',
          mergeExcelOutputFormat: ctx.input.outputFormat || 'XLSX'
        });
        break;

      case 'replace_text':
        result = await client.excelReplaceText({
          fileContent: ctx.input.fileContent,
          phrases: ctx.input.phrases
        });
        break;

      case 'secure':
        result = await client.post('/Excel/SecureExcel', {
          fileContent: ctx.input.fileContent,
          password: ctx.input.password
        });
        break;

      case 'unlock':
        result = await client.post('/Excel/UnlockExcel', {
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
      message: `Successfully performed **${ctx.input.operation.replace(/_/g, ' ')}** on Excel workbook.`
    };
  })
  .build();
