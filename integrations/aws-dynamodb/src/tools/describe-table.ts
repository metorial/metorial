import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let describeTable = SlateTool.create(spec, {
  name: 'Describe Table',
  key: 'describe_table',
  description: `Retrieve detailed information about a DynamoDB table including its key schema, provisioned throughput, indexes, stream configuration, and current status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to describe')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the table'),
      tableArn: z.string().describe('ARN of the table'),
      tableStatus: z.string().describe('Current status of the table'),
      tableId: z.string().optional().describe('Unique identifier of the table'),
      creationTimestamp: z.string().optional().describe('When the table was created'),
      itemCount: z.number().optional().describe('Approximate number of items'),
      tableSizeBytes: z.number().optional().describe('Table size in bytes'),
      billingMode: z.string().optional().describe('Billing mode'),
      keySchema: z
        .array(
          z.object({
            attributeName: z.string(),
            keyType: z.string()
          })
        )
        .describe('Primary key schema'),
      attributeDefinitions: z
        .array(
          z.object({
            attributeName: z.string(),
            attributeType: z.string()
          })
        )
        .describe('Attribute definitions'),
      provisionedThroughput: z
        .object({
          readCapacityUnits: z.number(),
          writeCapacityUnits: z.number()
        })
        .optional(),
      globalSecondaryIndexes: z
        .array(
          z.object({
            indexName: z.string(),
            indexStatus: z.string().optional(),
            keySchema: z.array(
              z.object({
                attributeName: z.string(),
                keyType: z.string()
              })
            ),
            projectionType: z.string(),
            itemCount: z.number().optional()
          })
        )
        .optional(),
      localSecondaryIndexes: z
        .array(
          z.object({
            indexName: z.string(),
            keySchema: z.array(
              z.object({
                attributeName: z.string(),
                keyType: z.string()
              })
            ),
            projectionType: z.string()
          })
        )
        .optional(),
      streamEnabled: z.boolean().optional(),
      streamViewType: z.string().optional(),
      latestStreamArn: z.string().optional(),
      tableClass: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.describeTable(ctx.input.tableName);
    let table = result.Table;

    return {
      output: {
        tableName: table.TableName,
        tableArn: table.TableArn,
        tableStatus: table.TableStatus,
        tableId: table.TableId,
        creationTimestamp: table.CreationDateTime ? String(table.CreationDateTime) : undefined,
        itemCount: table.ItemCount,
        tableSizeBytes: table.TableSizeBytes,
        billingMode: table.BillingModeSummary?.BillingMode,
        keySchema: (table.KeySchema || []).map((k: any) => ({
          attributeName: k.AttributeName,
          keyType: k.KeyType
        })),
        attributeDefinitions: (table.AttributeDefinitions || []).map((a: any) => ({
          attributeName: a.AttributeName,
          attributeType: a.AttributeType
        })),
        provisionedThroughput: table.ProvisionedThroughput
          ? {
              readCapacityUnits: table.ProvisionedThroughput.ReadCapacityUnits,
              writeCapacityUnits: table.ProvisionedThroughput.WriteCapacityUnits
            }
          : undefined,
        globalSecondaryIndexes: table.GlobalSecondaryIndexes?.map((g: any) => ({
          indexName: g.IndexName,
          indexStatus: g.IndexStatus,
          keySchema: (g.KeySchema || []).map((k: any) => ({
            attributeName: k.AttributeName,
            keyType: k.KeyType
          })),
          projectionType: g.Projection?.ProjectionType,
          itemCount: g.ItemCount
        })),
        localSecondaryIndexes: table.LocalSecondaryIndexes?.map((l: any) => ({
          indexName: l.IndexName,
          keySchema: (l.KeySchema || []).map((k: any) => ({
            attributeName: k.AttributeName,
            keyType: k.KeyType
          })),
          projectionType: l.Projection?.ProjectionType
        })),
        streamEnabled: table.StreamSpecification?.StreamEnabled,
        streamViewType: table.StreamSpecification?.StreamViewType,
        latestStreamArn: table.LatestStreamArn,
        tableClass: table.TableClassSummary?.TableClass
      },
      message: `Table **${table.TableName}** is ${table.TableStatus} with ~${table.ItemCount ?? 0} items (${table.TableSizeBytes ?? 0} bytes)`
    };
  })
  .build();
