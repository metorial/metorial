import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { accountIdInput } from '../lib/models';
import { spec } from '../spec';

export let deleteDataset = SlateTool.create(spec, {
  name: 'Delete Dataset',
  key: 'delete_dataset',
  description: `Permanently deletes a dataset and all its associated data. This action is irreversible. Use **Purge Dataset** instead if you want to clear the data but keep the dataset structure.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: accountIdInput,
      datasetId: z
        .string()
        .describe(
          'Identifier of the dataset (v1 UUID or v2 decimal ID encoded as text) to delete'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the deletion request'),
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, apiVersion: ctx.config.apiVersion });
    let result = await client.deleteDataset(ctx.input.datasetId, {
      accountId: ctx.input.accountId
    });

    return {
      output: {
        status: result.status,
        message: result.message
      },
      message: `Dataset **${ctx.input.datasetId}** has been permanently deleted.`
    };
  })
  .build();
