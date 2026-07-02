import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let convertFile = SlateTool.create(spec, {
  name: 'Convert File',
  key: 'convert_file',
  description: `Convert a file from one format to another using CloudConvert. Supports 200+ formats across audio, video, document, ebook, archive, image, spreadsheet, and presentation categories.

Use this to convert files by providing an import source (URL, S3, etc.) and specifying the desired output format. The converted file is exported to a temporary URL for download.`,
  instructions: [
    'The job creates an import task, a convert task, and an export task as a pipeline.',
    'Use the "options" field for format-specific settings like quality, page range, password, etc.',
    'Use the synchronous endpoint by setting "waitForCompletion" to true to wait for the result.'
  ],
  constraints: [
    'Sandbox environment only processes whitelisted files.',
    'Conversion credits are consumed in production.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sourceUrl: z.string().describe('URL of the file to convert'),
      inputFormat: z
        .string()
        .optional()
        .describe('Input file format (e.g., "pdf", "docx"). Auto-detected if omitted.'),
      outputFormat: z
        .string()
        .describe('Target output format (e.g., "pdf", "png", "mp4", "docx")'),
      engine: z
        .string()
        .optional()
        .describe(
          'Conversion engine to use (e.g., "office", "libreoffice"). Uses default if omitted.'
        ),
      engineVersion: z
        .string()
        .optional()
        .describe('Specific engine version for reproducible results'),
      filename: z.string().optional().describe('Custom filename for the output file'),
      options: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Format-specific conversion options (e.g., page range, quality, password, DPI)'
        ),
      tag: z.string().optional().describe('Tag to label the job for easier identification'),
      waitForCompletion: z
        .boolean()
        .optional()
        .default(true)
        .describe('Wait for the conversion to complete before returning')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('ID of the conversion job'),
      status: z.string().describe('Current status of the job'),
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('ID of the task'),
            operation: z.string().describe('Task operation type'),
            status: z.string().describe('Task status'),
            resultUrl: z
              .string()
              .optional()
              .describe('Temporary download URL for the output file'),
            resultFilename: z.string().optional().describe('Filename of the converted file')
          })
        )
        .describe('Tasks in the job with their statuses and results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let convertTaskInput: Record<string, any> = {
      input: ['import-file'],
      output_format: ctx.input.outputFormat
    };

    if (ctx.input.inputFormat) convertTaskInput.input_format = ctx.input.inputFormat;
    if (ctx.input.engine) convertTaskInput.engine = ctx.input.engine;
    if (ctx.input.engineVersion) convertTaskInput.engine_version = ctx.input.engineVersion;
    if (ctx.input.filename) convertTaskInput.filename = ctx.input.filename;
    if (ctx.input.options) {
      Object.assign(convertTaskInput, ctx.input.options);
    }

    let tasks: Record<string, any> = {
      'import-file': {
        operation: 'import/url',
        url: ctx.input.sourceUrl
      },
      'convert-file': {
        operation: 'convert',
        ...convertTaskInput
      },
      'export-file': {
        operation: 'export/url',
        input: ['convert-file']
      }
    };

    let job = await client.createJob(tasks, ctx.input.tag);
    ctx.info(`Created job ${job.id} with status: ${job.status}`);

    if (ctx.input.waitForCompletion) {
      job = await client.waitForJob(job.id);
      ctx.info(`Job ${job.id} completed with status: ${job.status}`);
    }

    let mappedTasks = (job.tasks ?? []).map((t: any) => {
      let resultFile = t.result?.files?.[0];
      return {
        taskId: t.id,
        operation: t.operation,
        status: t.status,
        resultUrl: resultFile?.url,
        resultFilename: resultFile?.filename
      };
    });

    let exportTask = mappedTasks.find((t: any) => t.operation === 'export/url');

    return {
      output: {
        jobId: job.id,
        status: job.status,
        tasks: mappedTasks
      },
      message:
        job.status === 'finished'
          ? `Converted file to **${ctx.input.outputFormat}**. ${exportTask?.resultUrl ? `Download: ${exportTask.resultUrl}` : ''}`
          : `Conversion job created (status: ${job.status}).`
    };
  })
  .build();
