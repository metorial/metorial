import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDataSource = SlateTool.create(spec, {
  name: 'Delete Data Source',
  key: 'delete_data_source',
  description: `Permanently deletes a data source and **all** of its contained datasets and data. This action is irreversible.`,
  constraints: [
    'This operation is permanent and cannot be undone.',
    'All datasets and data within the data source will be deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dataSourceId: z.number().describe('ID of the data source to delete')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the deletion request'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteDataSource(ctx.input.dataSourceId);

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `Data source **${ctx.input.dataSourceId}** has been permanently deleted along with all its datasets.`
    };
  })
  .build();
