import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let populateExcelTemplate = SlateTool.create(spec, {
  name: 'Populate Excel Template',
  key: 'populate_excel_template',
  description: `Generate Excel workbooks by populating an Excel template with dynamic JSON data. Inserts data into placeholders within the Excel template and can also add rows to existing worksheets or tables.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['populate', 'add_rows'])
        .describe('Whether to populate a template or add rows to an existing workbook'),
      fileContent: z.string().describe('Base64-encoded Excel file content'),
      jsonData: z
        .string()
        .describe('JSON string containing the data to populate or the rows to add'),
      calculateWorkbook: z
        .boolean()
        .optional()
        .describe('Recalculate workbook formulas after population'),
      useExcelDataTypes: z.boolean().optional().describe('Use Excel-native data types'),
      worksheetName: z.string().optional().describe('Target worksheet name (for add_rows)'),
      insertionRow: z.number().optional().describe('Row number to insert at (for add_rows)'),
      insertionColumn: z
        .number()
        .optional()
        .describe('Column number to insert at (for add_rows)'),
      tableName: z
        .string()
        .optional()
        .describe('Target table name within the worksheet (for add_rows)')
    })
  )
  .output(
    z.object({
      fileName: z.string().describe('Output filename'),
      fileContent: z.string().describe('Base64-encoded populated Excel file'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result: any;

    if (ctx.input.operation === 'populate') {
      result = await client.populateExcel({
        fileContent: ctx.input.fileContent,
        jsonData: ctx.input.jsonData,
        calculateWorkbook: ctx.input.calculateWorkbook ?? true,
        useExcelDataTypes: ctx.input.useExcelDataTypes ?? true
      });
    } else {
      let body: Record<string, any> = {
        fileContent: ctx.input.fileContent,
        jsonData: ctx.input.jsonData
      };
      if (ctx.input.worksheetName) body.worksheetName = ctx.input.worksheetName;
      if (ctx.input.insertionRow !== undefined) body.insertionRow = ctx.input.insertionRow;
      if (ctx.input.insertionColumn !== undefined)
        body.insertionColumn = ctx.input.insertionColumn;
      if (ctx.input.tableName) body.tableName = ctx.input.tableName;

      result = await client.addRowsToExcel(body);
    }

    return {
      output: {
        fileName: result.Filename,
        fileContent: result.FileContent,
        operationId: result.OperationId
      },
      message: `Successfully ${ctx.input.operation === 'populate' ? 'populated Excel template' : 'added rows to Excel workbook'}. Output: **${result.Filename}**`
    };
  })
  .build();
