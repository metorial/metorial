import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GigasheetClient } from '../lib/client';
import { normalizeLibraryEntry } from '../lib/files';
import { spec } from '../spec';

export let listExports = SlateTool.create(spec, {
  name: 'List Exports',
  key: 'list_exports',
  description:
    'List exports owned by the current user, including export handles and processing states. Pass an export handle to download_export once its state is processed.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Zero-based page number. Omit to retrieve the first page.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of exports per page. Omit to use the provider default.')
    })
  )
  .output(
    z.object({
      exports: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Exports with metadata, handles, names, and processing states'),
      count: z.number().describe('Number of exports returned')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.page !== undefined &&
      (!Number.isSafeInteger(ctx.input.page) || ctx.input.page < 0)
    ) {
      throw createApiServiceError('page must be a nonnegative whole number.');
    }
    if (
      ctx.input.pageSize !== undefined &&
      (!Number.isSafeInteger(ctx.input.pageSize) || ctx.input.pageSize < 1)
    ) {
      throw createApiServiceError('pageSize must be a positive whole number.');
    }
    let exports = await new GigasheetClient({ token: ctx.auth.token }).listExports(ctx.input);
    if (!Array.isArray(exports))
      throw createApiServiceError('Gigasheet returned an invalid export list.');
    let items = exports.map(normalizeLibraryEntry);
    return {
      output: { exports: items, count: items.length },
      message: `Found **${items.length}** exports.`
    };
  })
  .build();
