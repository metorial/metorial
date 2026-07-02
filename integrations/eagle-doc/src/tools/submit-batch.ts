import { SlateTool } from 'slates';
import { z } from 'zod';
import { EagleDocClient } from '../lib/client';
import { spec } from '../spec';

export let submitBatch = SlateTool.create(spec, {
  name: 'Submit Batch Processing',
  key: 'submit_batch',
  description: `Submit multiple documents for asynchronous batch OCR processing. Use this when you have many documents to process and don't need results immediately. Returns a task ID that can be used to poll for results with the "Check Batch Task" tool.

Supports both finance documents (invoices/receipts) and any document types (bank statements, passports, resumes, etc.).`,
  instructions: [
    'Provide multiple files as an array of base64-encoded documents.',
    'Use batchType "finance" for invoices and receipts, or "anydoc" for other document types.',
    'After submission, use the returned taskId with the "Check Batch Task" tool to poll for results.'
  ],
  constraints: [
    'Supported file formats: PDF, PNG, JPG/JPEG, TIF/TIFF.',
    'Tasks progress through statuses: Received → Processing → Finished (or Error).'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      batchType: z
        .enum(['finance', 'anydoc'])
        .describe(
          'Type of batch processing: "finance" for invoices/receipts, "anydoc" for other document types'
        ),
      files: z
        .array(
          z.object({
            fileBase64: z.string().describe('Base64-encoded document file content'),
            fileName: z.string().describe('Original file name with extension')
          })
        )
        .min(1)
        .describe('Array of documents to process'),
      docType: z
        .string()
        .optional()
        .describe(
          'For finance: "Invoice" or "Receipt". For anydoc: "BankStatement", "Passport", "Resume", etc.'
        ),
      configId: z
        .string()
        .optional()
        .describe('Custom extraction configuration ID (anydoc only)'),
      privacy: z
        .boolean()
        .optional()
        .describe('When true, files are not stored on the server'),
      includePolygons: z
        .boolean()
        .optional()
        .describe('Include coordinate data for text locations (finance only)'),
      includeFullText: z
        .boolean()
        .optional()
        .describe('Include full extracted text per page (finance only)')
    })
  )
  .output(
    z.object({
      taskId: z.string().describe('Task ID for polling results'),
      status: z.string().describe('Current task status'),
      numberOfFiles: z.number().optional().describe('Number of files submitted'),
      numberOfPages: z.number().optional().describe('Total pages to process'),
      createdTime: z.string().optional().describe('Task creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EagleDocClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    ctx.progress('Submitting batch...');

    let filesPayload = ctx.input.files.map(f => ({
      base64: f.fileBase64,
      fileName: f.fileName
    }));

    let result: any;

    if (ctx.input.batchType === 'finance') {
      result = await client.submitFinanceBatch({
        filesBase64: filesPayload,
        privacy: ctx.input.privacy,
        docType: ctx.input.docType,
        polygon: ctx.input.includePolygons,
        fullText: ctx.input.includeFullText
      });
    } else {
      result = await client.submitAnyDocBatch({
        filesBase64: filesPayload,
        privacy: ctx.input.privacy,
        docType: ctx.input.docType,
        configId: ctx.input.configId
      });
    }

    return {
      output: {
        taskId: result.id,
        status: result.status,
        numberOfFiles: result.numberOfFiles,
        numberOfPages: result.numberOfPages,
        createdTime: result.createdTime
      },
      message: `Batch task **${result.id}** submitted with ${result.numberOfFiles || ctx.input.files.length} file(s). Status: **${result.status}**.`
    };
  })
  .build();
