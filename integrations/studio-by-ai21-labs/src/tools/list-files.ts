import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fileSchema, mapFile } from '../lib/schemas';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Library Files',
  key: 'list_files',
  description: `List files in your AI21 document library. Optionally filter by labels. Returns file metadata including name, type, size, status, and labels.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      labels: z
        .array(z.string())
        .optional()
        .describe('Filter by these labels (case-sensitive)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset, default 0'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of files to return, 1-1000; default 1000'),
      name: z.string().optional().describe('Exact file name to filter by'),
      status: z
        .enum([
          'DB_RECORD_CREATED',
          'UPLOADED',
          'UPLOAD_FAILED',
          'PROCESSED',
          'PROCESSING_FAILED'
        ])
        .optional()
        .describe('Processing status to filter by'),
      path: z.string().optional().describe('Library path to filter by')
    })
  )
  .output(
    z.object({
      files: z.array(fileSchema).describe('List of files'),
      offset: z.number().describe('Offset used for this page'),
      limit: z.number().describe('Page size used'),
      nextOffset: z
        .number()
        .optional()
        .describe('Next offset when a full page was returned; the next page may be empty')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listFiles({
      labels: ctx.input.labels,
      offset: ctx.input.offset,
      limit: ctx.input.limit ?? 1000,
      name: ctx.input.name,
      status: ctx.input.status,
      path: ctx.input.path
    });

    const data = Array.isArray(result)
      ? result
      : isApiErrorRecord(result)
        ? (result.files ?? result.data)
        : undefined;
    if (!Array.isArray(data))
      throw createApiServiceError('AI21 Studio returned an invalid file listing.');
    let files = data.map(mapFile);
    const offset = ctx.input.offset ?? 0;
    const limit = ctx.input.limit ?? 1000;

    return {
      output: {
        files,
        offset,
        limit,
        nextOffset: files.length === limit ? offset + files.length : undefined
      },
      message: `Found **${files.length}** file(s) in the library.`
    };
  })
  .build();
