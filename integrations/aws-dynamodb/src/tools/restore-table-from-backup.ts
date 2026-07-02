import { SlateTool } from 'slates';
import { z } from 'zod';
import { dynamoDbServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let restoreTableFromBackup = SlateTool.create(spec, {
  name: 'Restore Table From Backup',
  key: 'restore_table_from_backup',
  description: 'Create a new DynamoDB table by restoring an existing on-demand backup.',
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      backupArn: z.string().describe('ARN of the backup to restore'),
      targetTableName: z.string().describe('Name of the new table to create'),
      billingModeOverride: z
        .enum(['PROVISIONED', 'PAY_PER_REQUEST'])
        .optional()
        .describe('Optional billing mode override for the restored table'),
      provisionedThroughputOverride: z
        .object({
          readCapacityUnits: z.number().describe('Read capacity units'),
          writeCapacityUnits: z.number().describe('Write capacity units')
        })
        .optional()
        .describe('Required when billingModeOverride is PROVISIONED')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the restored table'),
      tableArn: z.string().optional().describe('ARN of the restored table'),
      tableStatus: z.string().describe('Current table status'),
      tableId: z.string().optional().describe('Unique table identifier')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.billingModeOverride === 'PROVISIONED' &&
      !ctx.input.provisionedThroughputOverride
    ) {
      throw dynamoDbServiceError(
        'provisionedThroughputOverride is required when billingModeOverride is PROVISIONED.'
      );
    }
    if (
      ctx.input.billingModeOverride === 'PAY_PER_REQUEST' &&
      ctx.input.provisionedThroughputOverride
    ) {
      throw dynamoDbServiceError(
        'provisionedThroughputOverride cannot be set when billingModeOverride is PAY_PER_REQUEST.'
      );
    }

    let client = createClient(ctx.config, ctx.auth);
    let result = await client.restoreTableFromBackup({
      backupArn: ctx.input.backupArn,
      targetTableName: ctx.input.targetTableName,
      billingModeOverride: ctx.input.billingModeOverride,
      provisionedThroughputOverride: ctx.input.provisionedThroughputOverride
        ? {
            ReadCapacityUnits: ctx.input.provisionedThroughputOverride.readCapacityUnits,
            WriteCapacityUnits: ctx.input.provisionedThroughputOverride.writeCapacityUnits
          }
        : undefined
    });
    let table = result.TableDescription;

    return {
      output: {
        tableName: table.TableName,
        tableArn: table.TableArn,
        tableStatus: table.TableStatus,
        tableId: table.TableId
      },
      message: `Restoring backup to table **${table.TableName}** (status: ${table.TableStatus})`
    };
  })
  .build();
