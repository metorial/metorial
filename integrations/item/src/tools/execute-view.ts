import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validateObjectType, validateUuid } from '../lib/validation';
import { spec } from '../spec';

let paginationSchema = z.object({
  total: z.number().int().min(0).optional().describe('Total records matching the view'),
  limit: z.number().int().min(0).optional().describe('Maximum records returned in this page'),
  offset: z.number().int().min(0).optional().describe('Number of records skipped'),
  hasMore: z.boolean().optional().describe('Whether additional records are available')
});

export let executeView = SlateTool.create(spec, {
  name: 'Execute View',
  key: 'execute_view',
  description:
    'Run a shared item view and return its filtered, sorted records. This is the preferred way to pull structured item data on a schedule.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .trim()
        .min(1)
        .describe('Object type slug such as "contacts", "companies", or a custom object slug'),
      viewId: z.string().uuid().describe('Shared view UUID to execute'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of records to return'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      viewId: z.string().uuid().describe('Executed view UUID'),
      viewName: z.string().optional().describe('Executed view name'),
      objectRecords: z
        .array(z.record(z.string(), z.any()))
        .describe('Records returned by the view'),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    validateObjectType(ctx.input.objectType);
    validateUuid(ctx.input.viewId, 'viewId');
    let client = new Client({ token: ctx.auth.token });
    let result = await client.executeView(ctx.input.objectType, ctx.input.viewId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: {
        viewId: result.view?.id ?? ctx.input.viewId,
        viewName: result.view?.name,
        objectRecords: result.data,
        pagination: result.pagination
          ? {
              total: result.pagination.total,
              limit: result.pagination.limit,
              offset: result.pagination.offset,
              hasMore: result.pagination.has_more
            }
          : undefined
      },
      message: `Executed view **${ctx.input.viewId}** for **${ctx.input.objectType}** and returned **${result.data.length}** record(s).`
    };
  })
  .build();
