import { createApiServiceError, SlateTool } from 'slates';
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
      splitType: z
        .string()
        .optional()
        .describe(
          'NumberOfPages, PageArray, or BookmarkLevel. Legacy Pages and Range are also accepted.'
        ),
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
      operationStatus: z.string().describe('Encodian operation status'),
      statusUrl: z.string().optional().describe('Status URL for a queued operation'),
      operationId: z.string().describe('Encodian operation ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, input => ctx.addAttachment(input));

    if (ctx.input.operation === 'merge') {
      if (!ctx.input.documents?.length) {
        throw createApiServiceError('Provide documents to merge.');
      }
      let result = await client.mergePdfFiles({
        FileName: 'input.pdf',
        outputFilename: ctx.input.outputFilename || 'merged',
        documents: ctx.input.documents,
        FinalOperation: true
      });

      return {
        output: {
          fileName: result.Filename,
          fileContent: result.FileContent,
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId
        },
        message: client.message(
          `Successfully merged **${ctx.input.documents?.length || 0} documents** into **${result.Filename}**`
        )
      };
    } else {
      if (!ctx.input.fileContent?.trim()) {
        throw createApiServiceError('fileContent is required for PDF splitting.');
      }
      let splitType = ctx.input.splitType ?? 'Pages';
      let splitByType =
        splitType === 'Range' || (splitType === 'Pages' && ctx.input.pages)
          ? 'PageArray'
          : splitType === 'Pages'
            ? 'NumberOfPages'
            : splitType;
      if (!['NumberOfPages', 'PageArray', 'BookmarkLevel'].includes(splitByType)) {
        throw createApiServiceError(
          'splitType must be NumberOfPages, PageArray, BookmarkLevel, Pages, or Range.'
        );
      }
      let configuration = ctx.input.pages ?? '1';
      if (splitByType === 'PageArray') {
        let ranges = configuration.replace(/\[|\]|\s/g, '').split(',');
        if (
          ranges.some(range => {
            if (!/^\d+(?:-\d+)?$/.test(range)) return true;
            let [start = 0, end = start] = range.split('-').map(Number);
            return (
              !Number.isSafeInteger(start) ||
              !Number.isSafeInteger(end) ||
              start < 1 ||
              end < start
            );
          })
        ) {
          throw createApiServiceError(
            'pages must contain positive page numbers or ranges, such as "1-3,5,7-10".'
          );
        }
        configuration = ranges.map(range => `[${range}]`).join(',');
      } else if (
        !/^\d+$/.test(configuration) ||
        !Number.isSafeInteger(Number(configuration)) ||
        Number(configuration) < 1
      ) {
        throw createApiServiceError(
          'pages must be a positive whole number for NumberOfPages or BookmarkLevel.'
        );
      }
      let result = await client.splitPdf({
        fileName: 'input.pdf',
        fileContent: ctx.input.fileContent,
        splitByType,
        splitConfiguration: configuration
      });

      return {
        output: {
          documents:
            result.documents?.map((d: any) => ({
              fileName: d.fileName,
              fileContent: d.fileContent
            })) || [],
          operationStatus: client.operationStatus,
          statusUrl: client.statusUrl,
          operationId: result.OperationId
        },
        message: client.message(
          `Successfully split PDF into **${result.documents?.length || 0} documents**`
        )
      };
    }
  })
  .build();
