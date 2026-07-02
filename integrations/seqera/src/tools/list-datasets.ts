import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let listDatasets = SlateTool.create(spec, {
  name: 'List Datasets',
  key: 'list_datasets',
  description: `List datasets in a workspace. Datasets are versioned CSV/TSV samplesheets used as pipeline inputs. Supports searching by name and pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search filter for dataset name'),
      max: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      datasets: z
        .array(
          z.object({
            datasetId: z.string().optional().describe('Dataset ID'),
            name: z.string().optional().describe('Dataset name'),
            description: z.string().optional().describe('Dataset description'),
            mediaType: z.string().optional().describe('Media type (e.g., text/csv)'),
            dateCreated: z.string().optional().describe('Creation date'),
            lastUpdated: z.string().optional().describe('Last updated date')
          })
        )
        .describe('List of datasets'),
      totalSize: z.number().optional().describe('Total number of datasets')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    let result = await client.listDatasets({
      search: ctx.input.search,
      max: ctx.input.max,
      offset: ctx.input.offset
    });

    let datasets = result.datasets.map(d => ({
      datasetId: d.id,
      name: d.name,
      description: d.description,
      mediaType: d.mediaType,
      dateCreated: d.dateCreated,
      lastUpdated: d.lastUpdated
    }));

    return {
      output: { datasets, totalSize: result.totalSize },
      message: `Found **${datasets.length}** datasets${result.totalSize ? ` (${result.totalSize} total)` : ''}.`
    };
  })
  .build();
