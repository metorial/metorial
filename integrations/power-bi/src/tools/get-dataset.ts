import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let datasourceSchema = z.object({
  datasourceType: z.string().optional(),
  connectionDetails: z.any().optional(),
  datasourceId: z.string().optional(),
  gatewayId: z.string().optional()
});

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset Details',
  key: 'get_dataset',
  description: `Get detailed information about a Power BI dataset including its properties, data sources, parameters, tables, and refresh schedule.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset'),
      workspaceId: z.string().optional().describe('Workspace ID containing the dataset'),
      includeDatasources: z.boolean().optional().describe('Include data source details'),
      includeParameters: z.boolean().optional().describe('Include dataset parameters'),
      includeTables: z.boolean().optional().describe('Include table definitions'),
      includeRefreshSchedule: z.boolean().optional().describe('Include refresh schedule')
    })
  )
  .output(
    z.object({
      datasetId: z.string().describe('Dataset ID'),
      name: z.string().describe('Dataset name'),
      configuredBy: z.string().optional(),
      isRefreshable: z.boolean().optional(),
      webUrl: z.string().optional(),
      createdDate: z.string().optional(),
      datasources: z.array(datasourceSchema).optional().describe('Connected data sources'),
      parameters: z
        .array(
          z.object({
            name: z.string(),
            type: z.string().optional(),
            currentValue: z.string().optional(),
            isRequired: z.boolean().optional()
          })
        )
        .optional()
        .describe('Dataset parameters'),
      tables: z
        .array(
          z.object({
            name: z.string(),
            columns: z
              .array(
                z.object({
                  name: z.string(),
                  dataType: z.string().optional()
                })
              )
              .optional()
          })
        )
        .optional()
        .describe('Tables in the dataset'),
      refreshSchedule: z.any().optional().describe('Configured refresh schedule')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { datasetId, workspaceId } = ctx.input;

    let dataset = await client.getDataset(datasetId, workspaceId);

    let output: any = {
      datasetId: dataset.id,
      name: dataset.name,
      configuredBy: dataset.configuredBy,
      isRefreshable: dataset.isRefreshable,
      webUrl: dataset.webUrl,
      createdDate: dataset.createdDate
    };

    if (ctx.input.includeDatasources) {
      try {
        output.datasources = await client.getDatasources(datasetId, workspaceId);
      } catch {
        output.datasources = [];
      }
    }

    if (ctx.input.includeParameters) {
      try {
        output.parameters = await client.getDatasetParameters(datasetId, workspaceId);
      } catch {
        output.parameters = [];
      }
    }

    if (ctx.input.includeTables) {
      try {
        output.tables = await client.getDatasetTables(datasetId, workspaceId);
      } catch {
        output.tables = [];
      }
    }

    if (ctx.input.includeRefreshSchedule) {
      try {
        output.refreshSchedule = await client.getRefreshSchedule(datasetId, workspaceId);
      } catch {
        output.refreshSchedule = null;
      }
    }

    return {
      output,
      message: `Retrieved details for dataset **${dataset.name}**.`
    };
  })
  .build();
