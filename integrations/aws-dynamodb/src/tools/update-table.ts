import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updateTable = SlateTool.create(spec, {
  name: 'Update Table',
  key: 'update_table',
  description: `Update a DynamoDB table's settings including billing mode, provisioned throughput, stream configuration, and table class.
Can also be used to manage global secondary indexes (create, update, or delete).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to update'),
      billingMode: z
        .enum(['PROVISIONED', 'PAY_PER_REQUEST'])
        .optional()
        .describe('New billing mode'),
      provisionedThroughput: z
        .object({
          readCapacityUnits: z.number().describe('New read capacity units'),
          writeCapacityUnits: z.number().describe('New write capacity units')
        })
        .optional()
        .describe('New provisioned throughput (required if switching to PROVISIONED)'),
      enableStreams: z.boolean().optional().describe('Enable or disable DynamoDB Streams'),
      streamViewType: z
        .enum(['KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE', 'NEW_AND_OLD_IMAGES'])
        .optional()
        .describe('Stream view type when enabling streams'),
      tableClass: z
        .enum(['STANDARD', 'STANDARD_INFREQUENT_ACCESS'])
        .optional()
        .describe('New table class')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the updated table'),
      tableStatus: z.string().describe('Current status of the table')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.updateTable({
      tableName: ctx.input.tableName,
      billingMode: ctx.input.billingMode,
      provisionedThroughput: ctx.input.provisionedThroughput
        ? {
            ReadCapacityUnits: ctx.input.provisionedThroughput.readCapacityUnits,
            WriteCapacityUnits: ctx.input.provisionedThroughput.writeCapacityUnits
          }
        : undefined,
      streamSpecification:
        ctx.input.enableStreams !== undefined
          ? {
              StreamEnabled: ctx.input.enableStreams,
              StreamViewType: ctx.input.streamViewType
            }
          : undefined,
      tableClass: ctx.input.tableClass
    });

    let tableDesc = result.TableDescription;

    return {
      output: {
        tableName: tableDesc.TableName,
        tableStatus: tableDesc.TableStatus
      },
      message: `Updated table **${tableDesc.TableName}** (status: ${tableDesc.TableStatus})`
    };
  })
  .build();
