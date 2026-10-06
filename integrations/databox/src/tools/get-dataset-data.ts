import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput, datasetIdHelp, paginationSchema } from '../lib/models';
import { spec } from '../spec';

export const getDatasetData = SlateTool.create(spec, {
  name: 'Get Dataset Data',
  key: 'get_dataset_data',
  description:
    'Reads one page of stored dataset records and their column definitions. Available only in v2; use this to verify rows after ingestion or purge.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      datasetId: z.string().describe(datasetIdHelp),
      accountId: accountIdInput,
      page: z.number().optional().describe('Zero-based v2 page. Defaults to 0.'),
      pageSize: z
        .number()
        .optional()
        .describe('Rows per page, from 1 to 1000. Defaults to 200.')
    })
  )
  .output(
    z.object({
      records: z.array(z.record(z.string(), z.unknown())),
      pagination: paginationSchema,
      columns: z
        .array(
          z.object({
            id: z.string(),
            displayName: z.string().optional(),
            dataType: z.string(),
            order: z.number().optional(),
            visible: z.boolean().optional()
          })
        )
        .nullable()
        .optional(),
      lastUpdatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new Client({
      token: ctx.auth.token,
      apiVersion: ctx.config.apiVersion
    }).getDatasetData(ctx.input.datasetId, ctx.input);
    return {
      output: result,
      message: `Read **${result.records.length}** stored record(s) from dataset **${ctx.input.datasetId}**, page ${result.pagination.page}.`
    };
  })
  .build();
