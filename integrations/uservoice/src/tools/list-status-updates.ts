import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStatusUpdates = SlateTool.create(spec, {
  name: 'List Status Updates',
  key: 'list_status_updates',
  description:
    'Read public status update history, including status links and notification metadata.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      suggestionId: z.number().optional().describe('Suggestion ID from list_suggestions'),
      page: z.number().optional(),
      perPage: z.number().optional().describe('Results per page, up to 100'),
      cursor: z.string().optional().describe('Next-page cursor from a previous response'),
      sort: z.string().optional(),
      updatedAfter: z.string().optional(),
      updatedBefore: z.string().optional()
    })
  )
  .output(
    z.object({
      statusUpdates: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Provider status update records with IDs and links'),
      totalRecords: z.number().optional(),
      totalPages: z.number().optional(),
      currentPage: z.number().optional(),
      cursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain,
      legacySubdomain: ctx.config.subdomain
    }).listStatusUpdates({
      suggestion: ctx.input.suggestionId,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      cursor: ctx.input.cursor,
      sort: ctx.input.sort,
      updatedAfter: ctx.input.updatedAfter,
      updatedBefore: ctx.input.updatedBefore
    });
    return {
      output: {
        statusUpdates: result.statusUpdates,
        totalRecords: result.pagination.totalRecords,
        totalPages: result.pagination.totalPages,
        currentPage: result.pagination.page,
        cursor: result.pagination.cursor
      },
      message: 'Retrieved UserVoice records.'
    };
  })
  .build();
