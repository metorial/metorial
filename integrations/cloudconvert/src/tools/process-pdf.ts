import { SlateTool } from 'slates';
import { z } from 'zod';
import { invalidInput, invalidResponse } from '../lib/errors';
import { exportFiles } from '../lib/files';
import { createAndRead, jobMessage } from '../lib/jobs';
import { optionsInput, sourceUrl, tagInput, waitInput } from '../lib/schemas';
import { applyOptions, type Tasks } from '../lib/validation';
import { spec } from '../spec';
export const processPdf = SlateTool.create(spec, {
  name: 'Process PDF',
  key: 'process_pdf',
  description:
    'OCR, encrypt, decrypt, split, extract, rotate, or convert a PDF to PDF/A using the corresponding PDF operation. Provide all resulting downloadable files.',
  constraints: [
    'Production processing can consume credits. Sandbox processes only whitelisted files.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      sourceUrl,
      operation: z.enum(['ocr', 'encrypt', 'decrypt', 'split', 'extract', 'rotate', 'pdfa']),
      password: z
        .string()
        .optional()
        .describe('Decryption password, or new user password for encryption.'),
      ownerPassword: z.string().optional().describe('New owner password for encryption.'),
      pages: z
        .string()
        .optional()
        .describe(
          'Pages for extract or rotate, for example 1-3,5. Split produces one file per page.'
        ),
      rotation: z.number().optional().describe('90, 180, or 270 degrees for rotate.'),
      language: z.string().optional().describe('OCR language codes such as eng or eng+deu.'),
      pdfaProfile: z
        .string()
        .optional()
        .describe('pdfa-1b, pdfa-2b, or pdfa-3b; default pdfa-2b.'),
      options: optionsInput,
      tag: tagInput,
      waitForCompletion: waitInput
    })
  )
  .output(
    z.object({
      jobId: z.string(),
      status: z.string(),
      resultUrls: z.array(z.object({ url: z.string(), filename: z.string() })).optional()
    })
  )
  .handleInvocation(async ctx => {
    const op = ctx.input.operation;
    if (
      (ctx.input.ownerPassword !== undefined && op !== 'encrypt') ||
      (ctx.input.password !== undefined && !['encrypt', 'decrypt'].includes(op))
    )
      throw invalidInput('Password fields apply only to encryption or decryption.');
    if (ctx.input.pages !== undefined && !['extract', 'rotate'].includes(op))
      throw invalidInput(
        'pages applies only to extract or rotate. Split creates a file for each page.'
      );
    if (
      (ctx.input.rotation !== undefined && op !== 'rotate') ||
      (ctx.input.language !== undefined && op !== 'ocr') ||
      (ctx.input.pdfaProfile !== undefined && op !== 'pdfa')
    )
      throw invalidInput('Use only the options belonging to the selected PDF operation.');
    const operations = {
      ocr: 'pdf/ocr',
      encrypt: 'pdf/encrypt',
      decrypt: 'pdf/decrypt',
      split: 'pdf/split-pages',
      extract: 'pdf/extract-pages',
      rotate: 'pdf/rotate-pages',
      pdfa: 'pdf/a'
    };
    const task: Record<string, unknown> = {
      operation: operations[op],
      input: ['import-file']
    };
    if (op === 'encrypt') {
      if (!ctx.input.password && !ctx.input.ownerPassword)
        throw invalidInput('Encryption requires password or ownerPassword.');
      if (ctx.input.password !== undefined) task.set_password = ctx.input.password;
      if (ctx.input.ownerPassword !== undefined)
        task.set_owner_password = ctx.input.ownerPassword;
    }
    if (op === 'decrypt') {
      if (!ctx.input.password) throw invalidInput('Decryption requires password.');
      task.password = ctx.input.password;
    }
    if (ctx.input.pages !== undefined) {
      if (!/^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/.test(ctx.input.pages))
        throw invalidInput('pages must be a comma-separated list of page numbers or ranges.');
      task.pages = ctx.input.pages;
    }
    if (op === 'extract' && !ctx.input.pages) throw invalidInput('Extraction requires pages.');
    if (op === 'rotate') {
      if (![90, 180, 270].includes(ctx.input.rotation ?? 0))
        throw invalidInput('Rotation requires 90, 180, or 270 degrees.');
      task.rotation = `+${ctx.input.rotation}`;
    }
    if (op === 'ocr' && ctx.input.language !== undefined) {
      const languages = ctx.input.language.split(/[+,]/);
      if (languages.some(code => !/^[a-z]{3}$/.test(code)))
        throw invalidInput('Use three-letter OCR language codes separated by + or comma.');
      task.language = languages;
    }
    if (op === 'pdfa') {
      const profile = ctx.input.pdfaProfile ?? 'pdfa-2b';
      if (!/^pdfa-[123]b$/.test(profile))
        throw invalidInput('Use pdfa-1b, pdfa-2b, or pdfa-3b.');
      task.conformance_level = profile.slice(5);
    }
    applyOptions(task, ctx.input.options);
    const tasks: Tasks = {
      'import-file': { operation: 'import/url', url: ctx.input.sourceUrl },
      'process-pdf': task,
      'export-file': { operation: 'export/url', input: ['process-pdf'] }
    };
    const job = await createAndRead(ctx, tasks, ctx.input);
    const files = exportFiles(job);
    if (job.status === 'finished' && (!files.length || files.some(file => !file.url)))
      throw invalidResponse(
        `PDF job ${job.id} finished without usable exported files. Inspect the existing job.`
      );
    return {
      output: {
        jobId: job.id,
        status: job.status,
        resultUrls:
          job.status === 'finished'
            ? files.map(file => ({ filename: file.filename, url: file.url! }))
            : undefined
      },
      message: jobMessage(job, 'PDF processing')
    };
  })
  .build();
