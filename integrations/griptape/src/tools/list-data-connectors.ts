import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDataConnectors = SlateTool.create(spec, {
  name: 'List Data Connectors',
  key: 'list_data_connectors',
  description: `List all data connectors (data sources) in your Griptape Cloud organization. Data connectors bring external data into Griptape Cloud from sources like web pages, S3, Google Drive, Confluence, and more.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number to retrieve'),
      pageSize: z.number().optional().describe('Number of items per page')
    })
  )
  .output(
    z.object({
      dataConnectors: z
        .array(
          z.object({
            dataConnectorId: z.string().describe('ID of the data connector'),
            name: z.string().describe('Name of the data connector'),
            description: z.string().optional().describe('Description'),
            type: z.string().optional().describe('Type of data connector'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of data connectors'),
      totalCount: z.number().describe('Total number of data connectors'),
      totalPages: z.number().describe('Total number of pages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, baseUrl: ctx.config.baseUrl });
    let result = await client.listDataConnectors({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let dataConnectors = result.items.map((dc: any) => ({
      dataConnectorId: dc.data_connector_id,
      name: dc.name,
      description: dc.description,
      type: dc.type,
      createdAt: dc.created_at,
      updatedAt: dc.updated_at
    }));

    return {
      output: {
        dataConnectors,
        totalCount: result.pagination.totalCount,
        totalPages: result.pagination.totalPages
      },
      message: `Found **${result.pagination.totalCount}** data connector(s).`
    };
  })
  .build();
