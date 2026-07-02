import { SlateTool } from 'slates';
import { z } from 'zod';
import { ModeClient } from '../lib/client';
import { getEmbedded, normalizeDataSource } from '../lib/helpers';
import { spec } from '../spec';

export let listDataSources = SlateTool.create(spec, {
  name: 'List Data Sources',
  key: 'list_data_sources',
  description: `List all database connections (data sources) configured in the workspace. Returns each data source's name, adapter type, host, database, and port.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      dataSources: z.array(
        z.object({
          dataSourceToken: z.string().describe('Unique token of the data source'),
          name: z.string().describe('Name of the data source'),
          description: z.string().describe('Description of the data source'),
          adapter: z
            .string()
            .describe('Database adapter type (e.g. redshift, postgresql, bigquery)'),
          host: z.string().describe('Database host'),
          database: z.string().describe('Database name'),
          port: z.number().describe('Database port'),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ModeClient({
      token: ctx.auth.token,
      secret: ctx.auth.secret,
      workspaceName: ctx.config.workspaceName
    });

    let data = await client.listDataSources();
    let dataSources = getEmbedded(data, 'data_sources').map(normalizeDataSource);

    return {
      output: { dataSources },
      message: `Found **${dataSources.length}** data sources.`
    };
  })
  .build();
