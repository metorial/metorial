import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileSchema = z.object({
  fileId: z.string().describe('UUID of the file'),
  originalFilename: z.string().describe('Original filename at upload time'),
  size: z.number().describe('File size in bytes'),
  mimeType: z.string().describe('MIME type of the file'),
  isImage: z.boolean().describe('Whether the file is an image'),
  isReady: z.boolean().describe('Whether the file is ready for use'),
  datetimeUploaded: z.string().describe('ISO 8601 upload timestamp'),
  datetimeStored: z
    .string()
    .nullable()
    .describe('ISO 8601 store timestamp, null if not stored'),
  originalFileUrl: z.string().nullable().describe('CDN URL of the original file')
});

export let listFiles = SlateTool.create(spec, {
  name: 'List Files',
  key: 'list_files',
  description: `List files in your Uploadcare project with optional filtering and ordering. Supports pagination and filtering by stored/removed status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      stored: z
        .boolean()
        .optional()
        .describe('Filter by stored status: true for stored only, false for unstored only'),
      removed: z
        .boolean()
        .optional()
        .describe(
          'Filter by removed status: true for removed only, false for non-removed only'
        ),
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Number of results per page (1-1000, default 100)'),
      ordering: z
        .enum(['datetime_uploaded', '-datetime_uploaded'])
        .optional()
        .describe('Sort order by upload date'),
      fromDatetime: z.string().optional().describe('ISO 8601 datetime to start listing from')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of files matching the filter'),
      hasMore: z.boolean().describe('Whether there are more results available'),
      files: z.array(fileSchema).describe('List of files')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);

    let result = await client.listFiles({
      stored: ctx.input.stored,
      removed: ctx.input.removed,
      limit: ctx.input.limit,
      ordering: ctx.input.ordering,
      from: ctx.input.fromDatetime
    });

    let files = result.results.map(f => ({
      fileId: f.uuid,
      originalFilename: f.original_filename,
      size: f.size,
      mimeType: f.mime_type,
      isImage: f.is_image,
      isReady: f.is_ready,
      datetimeUploaded: f.datetime_uploaded,
      datetimeStored: f.datetime_stored,
      originalFileUrl: f.original_file_url
    }));

    return {
      output: {
        total: result.total,
        hasMore: result.next !== null,
        files
      },
      message: `Found **${result.total}** files total, returning **${files.length}** files.`
    };
  })
  .build();
