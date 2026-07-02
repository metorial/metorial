import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pdfMergeSplit = SlateTool.create(spec, {
  name: 'PDF Merge & Split',
  key: 'pdf_merge_split',
  description: `Merge multiple documents into a single PDF or split a PDF into separate files.
Use merge to combine multiple files (PDF, Word, Excel, etc.) into one PDF. Use split to divide a PDF by page ranges or into individual pages.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      operation: z
        .enum(['merge', 'split'])
        .describe('Whether to merge files into a PDF or split a PDF'),
      documents: z
        .array(
          z.object({
            fileName: z.string().describe('Filename with extension'),
            fileContent: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('Array of documents to merge (for merge operation)'),
      fileContent: z
        .string()
        .optional()
        .describe('Base64-encoded PDF content (for split operation)'),
      outputFilename: z.string().optional().describe('Desired output filename'),
      splitType: z.string().optional().describe('Split type (e.g., "Pages", "Range")'),
      pages: z
        .string()
        .optional()
        .describe('Page specification for split (e.g., "1-3,5,7-10")')
    })
  )
  .output(
    z.object({
      fileName: z.string().optional().describe('Output filename (for merge)'),
      fileContent: z.string().optional().describe('Base64-encoded output PDF (for merge)'),
      documents: z
        .array(
          z.object({
            fileName: z.string().describe('Output filename'),
            fileContent: z.string().describe('Base64-encoded file content')
          })
        )
        .optional()
        .describe('Array of split documents (for split)'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.operation === 'merge') {
      let result = await client.mergePdfFiles({
        outputFilename: ctx.input.outputFilename || 'merged',
        documents: ctx.input.documents
      });

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationId: result.OperationId
        },
        message: `Successfully merged **${ctx.input.documents?.length || 0} documents** into **${result.Filename}**`
      };
    } else {
      let result = await client.splitPdf({
        fileContent: ctx.input.fileContent,
        splitType: ctx.input.splitType || 'Pages',
        pages: ctx.input.pages
      });

      return {
        output: {
          documents:
            result.documents?.map((d: any) => ({
              fileName: d.fileName,
              fileContent: d.fileContent
            })) || [],
          operationId: result.OperationId
        },
        message: `Successfully split PDF into **${result.documents?.length || 0} documents**`
      };
    }
  })
  .build();
