import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let keySchemaSchema = z.object({
  attributeName: z.string().describe('Name of the key attribute'),
  keyType: z.enum(['HASH', 'RANGE']).describe('HASH for partition key, RANGE for sort key')
});

let attributeDefinitionSchema = z.object({
  attributeName: z.string().describe('Name of the attribute'),
  attributeType: z.enum(['S', 'N', 'B']).describe('S for String, N for Number, B for Binary')
});

let projectionSchema = z.object({
  projectionType: z.enum(['ALL', 'KEYS_ONLY', 'INCLUDE']).describe('Type of projection'),
  nonKeyAttributes: z
    .array(z.string())
    .optional()
    .describe('Non-key attributes to project (only for INCLUDE)')
});

let gsiSchema = z.object({
  indexName: z.string().describe('Name of the global secondary index'),
  keySchema: z.array(keySchemaSchema).describe('Key schema for the index'),
  projection: projectionSchema.describe('Projection settings'),
  provisionedThroughput: z
    .object({
      readCapacityUnits: z.number().describe('Read capacity units'),
      writeCapacityUnits: z.number().describe('Write capacity units')
    })
    .optional()
    .describe('Required if table uses PROVISIONED billing')
});

let lsiSchema = z.object({
  indexName: z.string().describe('Name of the local secondary index'),
  keySchema: z.array(keySchemaSchema).describe('Key schema for the index'),
  projection: projectionSchema.describe('Projection settings')
});

export let createTable = SlateTool.create(spec, {
  name: 'Create Table',
  key: 'create_table',
  description: `Create a new DynamoDB table with a specified key schema, attribute definitions, and optional secondary indexes.
Supports configuring billing mode (on-demand or provisioned), table class, DynamoDB Streams, and tags.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table to create'),
      keySchema: z
        .array(keySchemaSchema)
        .min(1)
        .max(2)
        .describe('Primary key schema (1 HASH key, optionally 1 RANGE key)'),
      attributeDefinitions: z
        .array(attributeDefinitionSchema)
        .min(1)
        .describe('Attribute definitions for key schema attributes'),
      billingMode: z
        .enum(['PROVISIONED', 'PAY_PER_REQUEST'])
        .optional()
        .default('PAY_PER_REQUEST')
        .describe('Billing mode for the table'),
      provisionedThroughput: z
        .object({
          readCapacityUnits: z.number().describe('Read capacity units'),
          writeCapacityUnits: z.number().describe('Write capacity units')
        })
        .optional()
        .describe('Required when billingMode is PROVISIONED'),
      globalSecondaryIndexes: z
        .array(gsiSchema)
        .optional()
        .describe('Global secondary indexes'),
      localSecondaryIndexes: z
        .array(lsiSchema)
        .optional()
        .describe('Local secondary indexes (can only be created at table creation time)'),
      tableClass: z
        .enum(['STANDARD', 'STANDARD_INFREQUENT_ACCESS'])
        .optional()
        .describe('Table class'),
      enableStreams: z.boolean().optional().describe('Enable DynamoDB Streams'),
      streamViewType: z
        .enum(['KEYS_ONLY', 'NEW_IMAGE', 'OLD_IMAGE', 'NEW_AND_OLD_IMAGES'])
        .optional()
        .describe('What data to include in stream records'),
      tags: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Tags to assign to the table')
    })
  )
  .output(
    z.object({
      tableName: z.string().describe('Name of the created table'),
      tableArn: z.string().describe('ARN of the created table'),
      tableStatus: z.string().describe('Current status of the table'),
      tableId: z.string().optional().describe('Unique identifier of the table')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.createTable({
      tableName: ctx.input.tableName,
      keySchema: ctx.input.keySchema.map(k => ({
        AttributeName: k.attributeName,
        KeyType: k.keyType
      })),
      attributeDefinitions: ctx.input.attributeDefinitions.map(a => ({
        AttributeName: a.attributeName,
        AttributeType: a.attributeType
      })),
      billingMode: ctx.input.billingMode,
      provisionedThroughput: ctx.input.provisionedThroughput
        ? {
            ReadCapacityUnits: ctx.input.provisionedThroughput.readCapacityUnits,
            WriteCapacityUnits: ctx.input.provisionedThroughput.writeCapacityUnits
          }
        : undefined,
      globalSecondaryIndexes: ctx.input.globalSecondaryIndexes?.map(g => ({
        IndexName: g.indexName,
        KeySchema: g.keySchema.map(k => ({
          AttributeName: k.attributeName,
          KeyType: k.keyType
        })),
        Projection: {
          ProjectionType: g.projection.projectionType,
          NonKeyAttributes: g.projection.nonKeyAttributes
        },
        ProvisionedThroughput: g.provisionedThroughput
          ? {
              ReadCapacityUnits: g.provisionedThroughput.readCapacityUnits,
              WriteCapacityUnits: g.provisionedThroughput.writeCapacityUnits
            }
          : undefined
      })),
      localSecondaryIndexes: ctx.input.localSecondaryIndexes?.map(l => ({
        IndexName: l.indexName,
        KeySchema: l.keySchema.map(k => ({
          AttributeName: k.attributeName,
          KeyType: k.keyType
        })),
        Projection: {
          ProjectionType: l.projection.projectionType,
          NonKeyAttributes: l.projection.nonKeyAttributes
        }
      })),
      tableClass: ctx.input.tableClass,
      streamSpecification: ctx.input.enableStreams
        ? {
            StreamEnabled: true,
            StreamViewType: ctx.input.streamViewType
          }
        : undefined,
      tags: ctx.input.tags?.map(t => ({
        Key: t.key,
        Value: t.value
      }))
    });

    let tableDesc = result.TableDescription;

    return {
      output: {
        tableName: tableDesc.TableName,
        tableArn: tableDesc.TableArn,
        tableStatus: tableDesc.TableStatus,
        tableId: tableDesc.TableId
      },
      message: `Created table **${tableDesc.TableName}** (status: ${tableDesc.TableStatus})`
    };
  })
  .build();
