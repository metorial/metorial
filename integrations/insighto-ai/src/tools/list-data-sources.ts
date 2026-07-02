import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDataSources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_data_sources',
  description: `Retrieve a paginated list of data sources (knowledge bases), or get a specific data source by ID including its files.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasourceId: z
        .string()
        .optional()
        .describe('Specific data source ID to retrieve details for'),
      includeFiles: z
        .boolean()
        .optional()
        .describe('Include files for the specified data source'),
      page: z.number().optional().describe('Page number (default 1)'),
      size: z.number().optional().describe('Items per page (default 50, max 100)')
    })
  )
  .output(
    z.object({
      dataSources: z
        .array(
          z.object({
            datasourceId: z.string(),
            name: z.string().optional()
          })
        )
        .optional(),
      dataSource: z
        .object({
          datasourceId: z.string(),
          name: z.string().optional(),
          files: z.array(z.any()).optional()
        })
        .optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.datasourceId) {
      let result = await client.getDataSource(ctx.input.datasourceId);
      let data = result.data || result;
      let files: any[] | undefined;

      if (ctx.input.includeFiles) {
        let filesResult = await client.listDataSourceFiles(ctx.input.datasourceId);
        files = filesResult.data || filesResult;
      }

      return {
        output: {
          dataSource: {
            datasourceId: data.id,
            name: data.name,
            files
          }
        },
        message: `Retrieved data source **${data.name || data.id}**.`
      };
    }

    let result = await client.listDataSources({ page: ctx.input.page, size: ctx.input.size });
    let items = result.data || result.items || result;
    let list = Array.isArray(items) ? items : [];
    return {
      output: {
        dataSources: list.map((d: any) => ({
          datasourceId: d.id,
          name: d.name
        })),
        totalCount: result.total || list.length
      },
      message: `Found **${list.length}** data source(s).`
    };
  })
  .build();
