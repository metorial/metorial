import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteTable = SlateTool.create(spec, {
  name: 'Delete Table',
  key: 'delete_table',
  description: `Permanently delete a DynamoDB table and all of its items. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to delete')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the deleted table'),
      tableStatus: z.string().describe('Status of the table (should be DELETING)')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.deleteTable(ctx.input.tableName);
    let tableDesc = result.TableDescription;

    return {
      output: {
        tableName: tableDesc.TableName,
        tableStatus: tableDesc.TableStatus
      },
      message: `Table **${tableDesc.TableName}** is being deleted (status: ${tableDesc.TableStatus})`
    };
  })
  .build();
