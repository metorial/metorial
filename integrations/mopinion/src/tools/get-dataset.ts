import { SlateTool } from 'slates';
import { z } from 'zod';
import { MopinionClient } from '../lib/client';
import { spec } from '../spec';

export let getDataset = SlateTool.create(spec, {
  name: 'Get Dataset',
  key: 'get_dataset',
  description:
    'Retrieve a Mopinion dataset name, parent report, description, and data source. Call list_reports with a reportId to discover its dataset IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      datasetId: z
        .number()
        .int()
        .positive()
        .describe('Dataset ID. Call list_reports with a reportId to discover dataset IDs.')
    })
  )
  .output(
    z.object({
      datasetId: z.number().describe('Dataset ID'),
      name: z.string().describe('Dataset name'),
      reportId: z.number().optional().describe('Parent report ID'),
      description: z.string().optional().describe('Dataset description'),
      dataSource: z.string().optional().describe('Source of the dataset feedback')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MopinionClient({
      publicKey: ctx.auth.publicKey,
      signatureToken: ctx.auth.signatureToken
    });
    let result = await client.getDataset(ctx.input.datasetId);
    let dataset = result.data ?? result;

    return {
      output: {
        datasetId: dataset.id ?? ctx.input.datasetId,
        name: dataset.name ?? '',
        reportId: dataset.report_id ?? dataset.reportId,
        description: dataset.description,
        dataSource: dataset.data_source ?? dataset.dataSource
      },
      message: `Retrieved dataset **${dataset.name || ctx.input.datasetId}**.`
    };
  })
  .build();
