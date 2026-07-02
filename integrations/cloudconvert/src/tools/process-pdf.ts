import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let processPdf = SlateTool.create(spec, {
  name: 'Process PDF',
  key: 'process_pdf',
  description: `Perform various PDF-specific operations including OCR, encryption, decryption, page splitting, page extraction, page rotation, and PDF/A conversion.

Select the desired operation and configure its specific options. Results are exported to a temporary URL.`,
  instructions: [
    'Set "operation" to choose the PDF processing type.',
    'For "encrypt": provide a userPassword or ownerPassword.',
    'For "split": optionally specify pages to split on.',
    'For "extract": specify the pages to extract.',
    'For "rotate": specify the rotation angle.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the PDF file to process'),
      operation: z
        .enum(['ocr', 'encrypt', 'decrypt', 'split', 'extract', 'rotate', 'pdfa'])
        .describe('PDF operation to perform'),
      password: z
        .string()
        .optional()
        .describe('Password for decryption, or user password for encryption'),
      ownerPassword: z.string().optional().describe('Owner password for encryption'),
      pages: z
        .string()
        .optional()
        .describe('Page specification (e.g., "1-3,5" for extract/split)'),
      rotation: z
        .number()
        .optional()
        .describe('Rotation angle in degrees (90, 180, 270) for rotate operation'),
      language: z.string().optional().describe('OCR language code (e.g., "eng", "deu")'),
      pdfaProfile: z.string().optional().describe('PDF/A profile (e.g., "pdfa-2b")'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional operation-specific options'),
      tag: z.string().optional().describe('Tag to label the job'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for processing to complete')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the PDF processing job'),
      status: z.string().describe('Current status of the job'),
      resultUrls: z
        .array(
          z.object({
            url: z.string().describe('Temporary download URL'),
            filename: z.string().describe('Filename of the result')
          })
        )
        .optional()
        .describe('Download URLs for the processed files (split may produce multiple)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let _operationMap: Record<string, string> = {
      ocr: 'optimize',
      encrypt: 'optimize',
      decrypt: 'optimize',
      split: 'optimize',
      extract: 'optimize',
      rotate: 'optimize',
      pdfa: 'optimize'
    };

    // CloudConvert uses specific operation endpoints for PDF operations
    let taskOperation: string;
    let processTask: Record<string, any> = {
      input: ['import-file'],
      input_format: 'pdf'
    };

    switch (ctx.input.operation) {
      case 'ocr':
        taskOperation = 'optimize';
        processTask.engine = 'ocrmypdf';
        if (ctx.input.language) processTask.language = ctx.input.language;
        break;
      case 'encrypt':
        taskOperation = 'optimize';
        processTask.engine = 'qpdf';
        if (ctx.input.password) processTask.user_password = ctx.input.password;
        if (ctx.input.ownerPassword) processTask.owner_password = ctx.input.ownerPassword;
        break;
      case 'decrypt':
        taskOperation = 'optimize';
        processTask.engine = 'qpdf';
        if (ctx.input.password) processTask.password = ctx.input.password;
        processTask.decrypt = true;
        break;
      case 'split':
        taskOperation = 'optimize';
        processTask.engine = 'qpdf';
        if (ctx.input.pages) processTask.pages = ctx.input.pages;
        processTask.split = true;
        break;
      case 'extract':
        taskOperation = 'optimize';
        processTask.engine = 'qpdf';
        if (ctx.input.pages) processTask.pages = ctx.input.pages;
        break;
      case 'rotate':
        taskOperation = 'optimize';
        processTask.engine = 'qpdf';
        if (ctx.input.rotation) processTask.rotate = ctx.input.rotation;
        if (ctx.input.pages) processTask.pages = ctx.input.pages;
        break;
      case 'pdfa':
        taskOperation = 'optimize';
        processTask.engine = 'ocrmypdf';
        processTask.output_format = 'pdfa';
        if (ctx.input.pdfaProfile) processTask.pdfa_profile = ctx.input.pdfaProfile;
        break;
    }

    if (ctx.input.options) {
      Object.assign(processTask, ctx.input.options);
    }

    processTask.operation = taskOperation!;

    let tasks: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      },
      'process-pdf': processTask,
      'export-file': {
        operation: 'export/url',
        input: ['process-pdf']
      }
    };

    let job = await client.createJob(tasks, ctx.input.tag);

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
    }

    let exportTask = (job.tasks ?? []).find((t: any) => t.operation === 'export/url');
    let resultFiles = (exportTask?.result?.files ?? []).map((f: any) => ({
      url: f.url,
      filename: f.filename
    }));

    return {
      output: {
        jobId: job.id,
        status: job.status,
        resultUrls: job.status === 'finished' ? resultFiles : undefined
      },
      message:
        job.status === 'finished'
          ? `PDF ${ctx.input.operation} completed. ${resultFiles.length} file(s) produced.`
          : `PDF processing job created (status: ${job.status}).`
    };
  })
  .build();
