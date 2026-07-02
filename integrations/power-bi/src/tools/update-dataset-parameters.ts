import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

export let updateDatasetParameters = SlateTool.create(spec, {
  name: 'Update Dataset Parameters',
  key: 'update_dataset_parameters',
  description: `Update parameter values on a Power BI dataset. Useful for changing connection strings, server names, database names, or other configurable parameters without modifying the dataset definition.`,
  constraints: [
    'The dataset must not be currently refreshing.',
    'You must have take-over or write permissions on the dataset.'
  ]
})
  .input(
    z.object({
      datasetId: z.string().describe('ID of the dataset'),
      workspaceId: z.string().optional().describe('Workspace ID containing the dataset'),
      parameters: z
        .array(
          z.object({
            name: z.string().describe('Parameter name'),
            newValue: z.string().describe('New parameter value')
          })
        )
        .describe('Parameters to update')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded'),
      updatedCount: z.number().describe('Number of parameters updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let { datasetId, workspaceId, parameters } = ctx.input;

    await client.updateDatasetParameters(datasetId, parameters, workspaceId);

    return {
      output: { success: true, updatedCount: parameters.length },
      message: `Updated **${parameters.length}** parameter(s) on dataset **${datasetId}**.`
    };
  })
  .build();
