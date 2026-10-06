import { SlateTool } from 'slates';
import { clientFor } from '../lib/client';
import { integrationId, jsonObject, text, z } from '../lib/schemas';
import { spec } from '../spec';
export const listFunctions = SlateTool.create(spec, {
  name: 'List Functions',
  key: 'list_functions',
  description:
    'Discover one native page of functions deployed to an exact integration from list_integrations. Use returned names, types, input schemas and model names before invoking actions, managing syncs or fetching records. Requires environment:functions:list; does not execute or download function source.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      uniqueKey: integrationId,
      type: z.enum(['sync', 'action', 'on-event']).optional(),
      search: text.max(255).optional(),
      page: z.number().int().nonnegative().optional(),
      limit: z.number().int().min(1).max(100).optional()
    })
  )
  .output(
    z.object({
      functions: z.array(
        z.object({
          name: text,
          type: z.enum(['sync', 'action', 'on-event']),
          models: z.array(z.string()).optional(),
          jsonSchema: jsonObject.optional(),
          input: z.string().nullish(),
          schedule: z.string().nullish(),
          enabled: z.boolean().optional(),
          lastDeployed: z.string().optional(),
          description: z.string().optional()
        })
      ),
      pagination: z.object({
        total: z.number().int().nonnegative(),
        page: z.number().int().nonnegative(),
        limit: z.number().int().positive()
      }),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    const result = await clientFor(ctx).listFunctions(ctx.input.uniqueKey, {
      ...ctx.input,
      page: ctx.input.page ?? 0,
      limit: ctx.input.limit ?? 20
    });
    return {
      output: {
        functions: result.data.map(item => ({
          name: item.name,
          type: item.type,
          models: item.returns,
          jsonSchema: item.json_schema,
          input: item.input,
          schedule: item.runs,
          enabled: item.enabled,
          lastDeployed: item.last_deployed,
          description: item.description
        })),
        pagination: result.pagination,
        hasMore:
          (result.pagination.page + 1) * result.pagination.limit < result.pagination.total
      },
      message: 'Retrieved one deployed-function page.'
    };
  })
  .build();
