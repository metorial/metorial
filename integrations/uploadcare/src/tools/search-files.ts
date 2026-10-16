import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let searchFiles = SlateTool.create(spec, {
  name: 'Search Files',
  key: 'search_files',
  description:
    'Search filenames, metadata, detected MIME types, and file UUIDs. Matching is substring-aware; newly uploaded files can take time to appear in search results.',
  constraints: ['The search result window is limited to 1000 records.'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .min(4)
        .describe('Full-text search across searchable fields; at least 4 characters'),
      isImage: z.boolean().optional().describe('Filter by whether the file is an image'),
      fuzziness: z
        .boolean()
        .optional()
        .describe('Enable typo tolerance; can increase search latency'),
      limit: z.number().min(1).max(100).optional().describe('Results per page, default 20'),
      offset: z
        .number()
        .min(0)
        .optional()
        .describe('Result offset, default 0; offset plus limit must not exceed 1000'),
      includeAppdata: z
        .boolean()
        .optional()
        .describe('Include add-on results in the provider file data')
    })
  )
  .output(
    z.object({
      total: z.number().optional(),
      nextPageUrl: z.string().nullable().optional(),
      previousPageUrl: z.string().nullable().optional(),
      files: z
        .array(
          z.object({
            fileId: z.string(),
            originalFilename: z.string(),
            mimeType: z.string(),
            size: z.number(),
            isImage: z.boolean(),
            isReady: z.boolean(),
            originalFileUrl: z.string().nullable(),
            metadata: z.record(z.string(), z.string()),
            appdata: z.unknown().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let limit = ctx.input.limit ?? 20;
    let offset = ctx.input.offset ?? 0;
    if (!Number.isInteger(limit) || !Number.isInteger(offset) || offset + limit > 1000) {
      throw createApiServiceError(
        'Search limit and offset must be whole numbers, and their sum must not exceed 1000.'
      );
    }
    let result = await new Client(ctx.auth).searchFiles(
      {
        query: ctx.input.query,
        is_image: ctx.input.isImage,
        fuzziness: ctx.input.fuzziness
      },
      {
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        include: ctx.input.includeAppdata ? 'appdata' : undefined
      }
    );
    return {
      output: {
        total: result.total,
        nextPageUrl: result.next,
        previousPageUrl: result.previous,
        files: result.results?.map(file => ({
          fileId: file.uuid,
          originalFilename: file.original_filename,
          mimeType: file.mime_type,
          size: file.size,
          isImage: file.is_image,
          isReady: file.is_ready,
          originalFileUrl: file.original_file_url,
          metadata: file.metadata,
          appdata: file.appdata
        }))
      },
      message: 'Retrieved matching files from Uploadcare.'
    };
  })
  .build();
