import { SlateTool } from 'slates';
import { z } from 'zod';
import { PowerBIClient } from '../lib/client';
import { spec } from '../spec';

let datasetSchema = z.object({
  datasetId: z.string().describe('Unique identifier of the dataset'),
  name: z.string().describe('Display name of the dataset'),
  configuredBy: z.string().optional().describe('User who configured the dataset'),
  isRefreshable: z.boolean().optional().describe('Whether the dataset can be refreshed'),
  isEffectiveIdentityRequired: z
    .boolean()
    .optional()
    .describe('Whether effective identity is required for row-level security'),
  isEffectiveIdentityRolesRequired: z
    .boolean()
    .optional()
    .describe('Whether effective identity roles are required'),
  webUrl: z.string().optional().describe('Web URL for the dataset'),
  createdDate: z.string().optional().describe('Date the dataset was created')
});

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List all Power BI datasets. Optionally filter by workspace. Returns dataset names, IDs, configuration details, and refresh capabilities.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID to filter datasets. If omitted, lists datasets from "My Workspace".'
        )
    })
  )
  .output(
    z.object({
      datasets: z.array(datasetSchema).describe('List of datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PowerBIClient({ token: ctx.auth.token });
    let datasets = await client.listDatasets(ctx.input.workspaceId);

    let mapped = datasets.map((d: any) => ({
      datasetId: d.id,
      name: d.name,
      configuredBy: d.configuredBy,
      isRefreshable: d.isRefreshable,
      isEffectiveIdentityRequired: d.isEffectiveIdentityRequired,
      isEffectiveIdentityRolesRequired: d.isEffectiveIdentityRolesRequired,
      webUrl: d.webUrl,
      createdDate: d.createdDate
    }));

    return {
      output: { datasets: mapped },
      message: `Found **${mapped.length}** dataset(s).`
    };
  })
  .build();
