import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pageInput, pageSizeInput, paginationSchema } from '../lib/models';
import { spec } from '../spec';

export const listDataSources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_data_sources',
  description:
    'Discovers data sources and their identifiers. v1 requires an accountId from list_accounts and returns an unpaginated list. v2 uses the authenticated organization or an explicit account header and returns one page.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: z
        .number()
        .optional()
        .describe(
          'Required in v1: account from list_accounts. Optional in v2: account ID sent as x-account-id when accounts are enabled; omit for the authenticated organization.'
        ),
      page: pageInput,
      pageSize: pageSizeInput
    })
  )
  .output(
    z.object({
      dataSources: z.array(
        z.object({
          dataSourceId: z.number(),
          title: z.string(),
          created: z.string(),
          timezone: z.string(),
          sourceKey: z.string().describe('Non-secret internal integration identifier'),
          ingestionSupported: z.boolean().optional()
        })
      ),
      pagination: paginationSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    }).listDataSources(ctx.input);
    return {
      output: {
        dataSources: result.sources.map(source => ({
          dataSourceId: source.id,
          title: source.title,
          created: source.created,
          timezone: source.timezone,
          sourceKey: source.key,
          ingestionSupported:
            'ingestionSupported' in source ? source.ingestionSupported : undefined
        })),
        pagination: result.pagination
      },
      message: `Retrieved **${result.sources.length}** data source(s) from the requested scope.`
    };
  })
  .build();
