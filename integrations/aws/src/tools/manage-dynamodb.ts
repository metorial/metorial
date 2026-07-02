import {
  CreateTableCommand,
  DeleteItemCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  GetItemCommand,
  ListTablesCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
  UpdateItemCommand
} from '@aws-sdk/client-dynamodb';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { awsServiceError } from '../lib/errors';
import { clientFromContext } from '../lib/helpers';
import { spec } from '../spec';

// ---------------------------------------------------------------------------
// DynamoDB attribute value marshalling helpers
// ---------------------------------------------------------------------------

type DynamoDBAttributeValue = Record<string, any>;

let toDynamoDBValue = (value: any): DynamoDBAttributeValue => {
  if (value === null || value === undefined) {
    return { NULL: true };
  }
  if (typeof value === 'string') {
    return { S: value };
  }
  if (typeof value === 'number') {
    return { N: String(value) };
  }
  if (typeof value === 'boolean') {
    return { BOOL: value };
  }
  if (Array.isArray(value)) {
    return { L: value.map(toDynamoDBValue) };
  }
  if (typeof value === 'object') {
    let m: Record<string, DynamoDBAttributeValue> = {};
    for (let [k, v] of Object.entries(value)) {
      m[k] = toDynamoDBValue(v);
    }
    return { M: m };
  }
  return { S: String(value) };
};

let toDynamoDBItem = (item: Record<string, any>): Record<string, DynamoDBAttributeValue> => {
  let result: Record<string, DynamoDBAttributeValue> = {};
  for (let [key, value] of Object.entries(item)) {
    result[key] = toDynamoDBValue(value);
  }
  return result;
};

let fromDynamoDBValue = (attr: DynamoDBAttributeValue): any => {
  if (attr.S !== undefined) return attr.S;
  if (attr.N !== undefined) return Number(attr.N);
  if (attr.BOOL !== undefined) return attr.BOOL;
  if (attr.NULL) return null;
  if (attr.L !== undefined) return attr.L.map(fromDynamoDBValue);
  if (attr.M !== undefined) return fromDynamoDBItem(attr.M);
  if (attr.SS !== undefined) return attr.SS;
  if (attr.NS !== undefined) return attr.NS.map(Number);
  if (attr.BS !== undefined) return attr.BS;
  if (attr.B !== undefined) return attr.B;
  return attr;
};

let fromDynamoDBItem = (item: Record<string, DynamoDBAttributeValue>): Record<string, any> => {
  let result: Record<string, any> = {};
  for (let [key, attr] of Object.entries(item)) {
    result[key] = fromDynamoDBValue(attr);
  }
  return result;
};

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

let keySchemaElementSchema = z.object({
  attributeName: z.string().describe('Name of the key attribute'),
  keyType: z.enum(['HASH', 'RANGE']).describe('HASH for partition key, RANGE for sort key')
});

let attributeDefinitionSchema = z.object({
  attributeName: z.string().describe('Name of the attribute'),
  attributeType: z.enum(['S', 'N', 'B']).describe('S for String, N for Number, B for Binary')
});

let projectionSchema = z.object({
  projectionType: z.enum(['ALL', 'KEYS_ONLY', 'INCLUDE']).describe('Type of index projection'),
  nonKeyAttributes: z
    .array(z.string())
    .optional()
    .describe('Non-key attributes to project (only for INCLUDE type)')
});

let globalSecondaryIndexSchema = z.object({
  indexName: z.string().describe('Name of the global secondary index'),
  keySchema: z.array(keySchemaElementSchema).describe('Key schema for the index'),
  projection: projectionSchema.describe('Projection settings for the index'),
  provisionedThroughput: z
    .object({
      readCapacityUnits: z.number().describe('Provisioned read capacity units'),
      writeCapacityUnits: z.number().describe('Provisioned write capacity units')
    })
    .optional()
    .describe('Required when table uses PROVISIONED billing mode')
});

let localSecondaryIndexSchema = z.object({
  indexName: z.string().describe('Name of the local secondary index'),
  keySchema: z.array(keySchemaElementSchema).describe('Key schema for the index'),
  projection: projectionSchema.describe('Projection settings for the index')
});

// ---------------------------------------------------------------------------
// Tool definition
// ---------------------------------------------------------------------------

export let manageDynamoDbTool = SlateTool.create(spec, {
  name: 'Manage DynamoDB',
  key: 'manage_dynamodb',
  description: `Manage AWS DynamoDB tables and items. Supports listing, describing, creating, and deleting tables, as well as putting, getting, querying, scanning, and deleting items.

Accepts plain JSON objects for items and keys -- automatic conversion to/from DynamoDB attribute format is handled internally.`,
  instructions: [
    'For "list_tables", no additional parameters are required.',
    'For "describe_table", provide "tableName".',
    'For "create_table", provide "tableName", "keySchema", "attributeDefinitions", and optionally billing/index configuration.',
    'For "delete_table", provide "tableName". This action is irreversible.',
    'For "put_item", provide "tableName" and "item" as a plain JSON object.',
    'For "get_item", provide "tableName" and "key" as a plain JSON object with the primary key attributes.',
    'For "update_item", provide "tableName", "key", and "updateExpression". Use "expressionAttributeValues" in plain JSON.',
    'For "query", provide "tableName" and "keyConditionExpression" with "expressionAttributeValues" in plain JSON.',
    'For "scan", provide "tableName" and optionally a "filterExpression".',
    'For "delete_item", provide "tableName" and "key" as a plain JSON object with the primary key attributes.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_tables',
          'describe_table',
          'create_table',
          'delete_table',
          'put_item',
          'get_item',
          'update_item',
          'query',
          'scan',
          'delete_item'
        ])
        .describe('The DynamoDB operation to perform'),

      // Common
      tableName: z
        .string()
        .optional()
        .describe('Name of the DynamoDB table (required for all actions except list_tables)'),

      // list_tables
      limit: z
        .number()
        .optional()
        .describe(
          'Maximum number of table names to return (list_tables) or items to evaluate (query/scan)'
        ),
      exclusiveStartTableName: z
        .string()
        .optional()
        .describe('Table name to start listing after, for pagination (list_tables)'),

      // create_table
      keySchema: z
        .array(keySchemaElementSchema)
        .optional()
        .describe(
          'Primary key schema: one HASH element and optionally one RANGE element (create_table)'
        ),
      attributeDefinitions: z
        .array(attributeDefinitionSchema)
        .optional()
        .describe('Attribute definitions for key schema attributes (create_table)'),
      billingMode: z
        .enum(['PROVISIONED', 'PAY_PER_REQUEST'])
        .optional()
        .describe('Billing mode for the table (create_table). Defaults to PAY_PER_REQUEST'),
      provisionedThroughput: z
        .object({
          readCapacityUnits: z.number().describe('Provisioned read capacity units'),
          writeCapacityUnits: z.number().describe('Provisioned write capacity units')
        })
        .optional()
        .describe('Required when billingMode is PROVISIONED (create_table)'),
      globalSecondaryIndexes: z
        .array(globalSecondaryIndexSchema)
        .optional()
        .describe('Global secondary indexes to create (create_table)'),
      localSecondaryIndexes: z
        .array(localSecondaryIndexSchema)
        .optional()
        .describe('Local secondary indexes to create (create_table)'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags to assign to the table (create_table)'),

      // put_item / get_item / delete_item
      item: z
        .record(z.string(), z.any())
        .optional()
        .describe('Plain JSON object representing the item to put (put_item)'),
      key: z
        .record(z.string(), z.any())
        .optional()
        .describe('Plain JSON object with primary key attributes (get_item, delete_item)'),
      conditionExpression: z
        .string()
        .optional()
        .describe(
          'Condition expression that must be satisfied (put_item, update_item, delete_item)'
        ),
      updateExpression: z
        .string()
        .optional()
        .describe(
          'Update expression for update_item, e.g. "SET #status = :status, attempts = attempts + :one"'
        ),
      returnValues: z
        .enum(['NONE', 'ALL_OLD', 'UPDATED_OLD', 'ALL_NEW', 'UPDATED_NEW'])
        .optional()
        .describe('Attributes to return for update_item. Defaults to ALL_NEW.'),
      returnOldItem: z
        .boolean()
        .optional()
        .describe('Return the previous/deleted item if it existed (put_item, delete_item)'),

      // get_item
      consistentRead: z
        .boolean()
        .optional()
        .describe('Use strongly consistent read (get_item, query, scan)'),

      // query / scan
      indexName: z
        .string()
        .optional()
        .describe('Name of a secondary index to query or scan (query, scan)'),
      keyConditionExpression: z
        .string()
        .optional()
        .describe(
          'Key condition expression for the partition key and optionally sort key (query)'
        ),
      filterExpression: z
        .string()
        .optional()
        .describe('Filter expression applied after reading (query, scan)'),
      projectionExpression: z
        .string()
        .optional()
        .describe('Comma-separated list of attributes to return (get_item, query, scan)'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for attribute names in expressions'),
      expressionAttributeValues: z
        .record(z.string(), z.any())
        .optional()
        .describe('Substitution tokens for attribute values in expressions as plain JSON'),
      scanIndexForward: z
        .boolean()
        .optional()
        .describe('true for ascending sort key order, false for descending (query)'),
      exclusiveStartKey: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pagination start key from a previous query/scan as plain JSON')
    })
  )
  .output(
    z.object({
      // list_tables
      tableNames: z.array(z.string()).optional().describe('List of table names (list_tables)'),
      lastEvaluatedTableName: z
        .string()
        .optional()
        .describe('Last table name for pagination (list_tables)'),

      // describe_table
      table: z
        .object({
          tableName: z.string().describe('Name of the table'),
          tableArn: z.string().describe('ARN of the table'),
          tableStatus: z.string().describe('Current status of the table'),
          tableId: z.string().optional().describe('Unique identifier of the table'),
          creationDateTime: z.string().optional().describe('When the table was created'),
          itemCount: z.number().optional().describe('Approximate number of items'),
          tableSizeBytes: z.number().optional().describe('Table size in bytes'),
          billingMode: z.string().optional().describe('Billing mode summary'),
          keySchema: z
            .array(
              z.object({
                attributeName: z.string().describe('Attribute name'),
                keyType: z.string().describe('Key type')
              })
            )
            .optional()
            .describe('Primary key schema'),
          attributeDefinitions: z
            .array(
              z.object({
                attributeName: z.string().describe('Attribute name'),
                attributeType: z.string().describe('Attribute type')
              })
            )
            .optional()
            .describe('Attribute definitions'),
          provisionedThroughput: z
            .object({
              readCapacityUnits: z.number().describe('Read capacity units'),
              writeCapacityUnits: z.number().describe('Write capacity units')
            })
            .optional()
            .describe('Provisioned throughput settings'),
          globalSecondaryIndexes: z
            .array(
              z.object({
                indexName: z.string().describe('Index name'),
                indexStatus: z.string().optional().describe('Index status'),
                keySchema: z
                  .array(
                    z.object({
                      attributeName: z.string().describe('Attribute name'),
                      keyType: z.string().describe('Key type')
                    })
                  )
                  .describe('Key schema'),
                projectionType: z.string().describe('Projection type'),
                itemCount: z.number().optional().describe('Approximate item count')
              })
            )
            .optional()
            .describe('Global secondary indexes'),
          localSecondaryIndexes: z
            .array(
              z.object({
                indexName: z.string().describe('Index name'),
                keySchema: z
                  .array(
                    z.object({
                      attributeName: z.string().describe('Attribute name'),
                      keyType: z.string().describe('Key type')
                    })
                  )
                  .describe('Key schema'),
                projectionType: z.string().describe('Projection type')
              })
            )
            .optional()
            .describe('Local secondary indexes'),
          streamEnabled: z.boolean().optional().describe('Whether streams are enabled'),
          streamViewType: z.string().optional().describe('Stream view type'),
          latestStreamArn: z.string().optional().describe('ARN of the latest stream'),
          tableClass: z.string().optional().describe('Table class')
        })
        .optional()
        .describe('Table details (describe_table)'),

      // create_table / delete_table
      tableName: z.string().optional().describe('Name of the created or deleted table'),
      tableArn: z.string().optional().describe('ARN of the created table'),
      tableStatus: z.string().optional().describe('Status of the table after the operation'),

      // put_item / delete_item
      success: z.boolean().optional().describe('Whether the write/delete operation succeeded'),
      oldItem: z
        .record(z.string(), z.any())
        .optional()
        .describe('Previous item value if returnOldItem was true'),
      updatedItem: z
        .record(z.string(), z.any())
        .optional()
        .describe('Returned item attributes from update_item based on returnValues'),

      // get_item
      found: z.boolean().optional().describe('Whether the item was found (get_item)'),
      item: z
        .record(z.string(), z.any())
        .optional()
        .describe('Retrieved item as plain JSON (get_item)'),

      // query / scan
      items: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Retrieved items as plain JSON objects (query, scan)'),
      count: z.number().optional().describe('Number of items returned (query, scan)'),
      scannedCount: z
        .number()
        .optional()
        .describe('Number of items evaluated before filtering (query, scan)'),
      lastEvaluatedKey: z
        .record(z.string(), z.any())
        .optional()
        .describe('Pagination key for next page as plain JSON (query, scan)')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFromContext(ctx);
    let { action } = ctx.input;

    let requireInput = <T>(value: T | undefined | null, field: string): T => {
      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.length === 0)
      ) {
        throw awsServiceError(`${field} is required for ${action}`);
      }
      return value;
    };

    // Helper to make DynamoDB SDK calls
    let dynamo = async (target: string, payload: Record<string, any>): Promise<any> => {
      switch (target) {
        case 'ListTables':
          return client.send(target, () =>
            client.dynamoDb.send(new ListTablesCommand(payload as any))
          );
        case 'DescribeTable':
          return client.send(target, () =>
            client.dynamoDb.send(new DescribeTableCommand(payload as any))
          );
        case 'CreateTable':
          return client.send(target, () =>
            client.dynamoDb.send(new CreateTableCommand(payload as any))
          );
        case 'DeleteTable':
          return client.send(target, () =>
            client.dynamoDb.send(new DeleteTableCommand(payload as any))
          );
        case 'PutItem':
          return client.send(target, () =>
            client.dynamoDb.send(new PutItemCommand(payload as any))
          );
        case 'GetItem':
          return client.send(target, () =>
            client.dynamoDb.send(new GetItemCommand(payload as any))
          );
        case 'UpdateItem':
          return client.send(target, () =>
            client.dynamoDb.send(new UpdateItemCommand(payload as any))
          );
        case 'Query':
          return client.send(target, () =>
            client.dynamoDb.send(new QueryCommand(payload as any))
          );
        case 'Scan':
          return client.send(target, () =>
            client.dynamoDb.send(new ScanCommand(payload as any))
          );
        case 'DeleteItem':
          return client.send(target, () =>
            client.dynamoDb.send(new DeleteItemCommand(payload as any))
          );
        default:
          throw awsServiceError(`Unknown DynamoDB SDK operation: ${target}`);
      }
    };

    // Convert user-supplied expressionAttributeValues to DynamoDB format
    let marshalExprValues = (
      vals?: Record<string, any>
    ): Record<string, DynamoDBAttributeValue> | undefined => {
      if (!vals) return undefined;
      return toDynamoDBItem(vals);
    };

    // Convert user-supplied key/exclusiveStartKey to DynamoDB format
    let marshalKey = (
      key?: Record<string, any>
    ): Record<string, DynamoDBAttributeValue> | undefined => {
      if (!key) return undefined;
      return toDynamoDBItem(key);
    };

    // -----------------------------------------------------------------------
    // list_tables
    // -----------------------------------------------------------------------
    if (action === 'list_tables') {
      let payload: Record<string, any> = {};
      if (ctx.input.limit !== undefined) payload.Limit = ctx.input.limit;
      if (ctx.input.exclusiveStartTableName)
        payload.ExclusiveStartTableName = ctx.input.exclusiveStartTableName;

      let result = await dynamo('ListTables', payload);

      return {
        output: {
          tableNames: result.TableNames ?? [],
          lastEvaluatedTableName: result.LastEvaluatedTableName
        },
        message: `Found **${(result.TableNames ?? []).length}** table(s)${result.LastEvaluatedTableName ? ' (more available)' : ''}`
      };
    }

    // -----------------------------------------------------------------------
    // describe_table
    // -----------------------------------------------------------------------
    if (action === 'describe_table') {
      let result = await dynamo('DescribeTable', {
        TableName: requireInput(ctx.input.tableName, 'tableName')
      });
      let t = result.Table;

      return {
        output: {
          table: {
            tableName: t.TableName,
            tableArn: t.TableArn,
            tableStatus: t.TableStatus,
            tableId: t.TableId,
            creationDateTime: t.CreationDateTime ? String(t.CreationDateTime) : undefined,
            itemCount: t.ItemCount,
            tableSizeBytes: t.TableSizeBytes,
            billingMode: t.BillingModeSummary?.BillingMode,
            keySchema: (t.KeySchema ?? []).map((k: any) => ({
              attributeName: k.AttributeName,
              keyType: k.KeyType
            })),
            attributeDefinitions: (t.AttributeDefinitions ?? []).map((a: any) => ({
              attributeName: a.AttributeName,
              attributeType: a.AttributeType
            })),
            provisionedThroughput: t.ProvisionedThroughput
              ? {
                  readCapacityUnits: t.ProvisionedThroughput.ReadCapacityUnits,
                  writeCapacityUnits: t.ProvisionedThroughput.WriteCapacityUnits
                }
              : undefined,
            globalSecondaryIndexes: t.GlobalSecondaryIndexes?.map((g: any) => ({
              indexName: g.IndexName,
              indexStatus: g.IndexStatus,
              keySchema: (g.KeySchema ?? []).map((k: any) => ({
                attributeName: k.AttributeName,
                keyType: k.KeyType
              })),
              projectionType: g.Projection?.ProjectionType,
              itemCount: g.ItemCount
            })),
            localSecondaryIndexes: t.LocalSecondaryIndexes?.map((l: any) => ({
              indexName: l.IndexName,
              keySchema: (l.KeySchema ?? []).map((k: any) => ({
                attributeName: k.AttributeName,
                keyType: k.KeyType
              })),
              projectionType: l.Projection?.ProjectionType
            })),
            streamEnabled: t.StreamSpecification?.StreamEnabled,
            streamViewType: t.StreamSpecification?.StreamViewType,
            latestStreamArn: t.LatestStreamArn,
            tableClass: t.TableClassSummary?.TableClass
          }
        },
        message: `Table **${t.TableName}** is ${t.TableStatus} with ~${t.ItemCount ?? 0} items (${t.TableSizeBytes ?? 0} bytes)`
      };
    }

    // -----------------------------------------------------------------------
    // create_table
    // -----------------------------------------------------------------------
    if (action === 'create_table') {
      let tableName = requireInput(ctx.input.tableName, 'tableName');
      let keySchema = requireInput(ctx.input.keySchema, 'keySchema');
      let attributeDefinitions = requireInput(
        ctx.input.attributeDefinitions,
        'attributeDefinitions'
      );

      let payload: Record<string, any> = {
        TableName: tableName,
        KeySchema: keySchema.map(k => ({
          AttributeName: k.attributeName,
          KeyType: k.keyType
        })),
        AttributeDefinitions: attributeDefinitions.map(a => ({
          AttributeName: a.attributeName,
          AttributeType: a.attributeType
        })),
        BillingMode: ctx.input.billingMode ?? 'PAY_PER_REQUEST'
      };

      if (ctx.input.provisionedThroughput) {
        payload.ProvisionedThroughput = {
          ReadCapacityUnits: ctx.input.provisionedThroughput.readCapacityUnits,
          WriteCapacityUnits: ctx.input.provisionedThroughput.writeCapacityUnits
        };
      }

      if (ctx.input.globalSecondaryIndexes) {
        payload.GlobalSecondaryIndexes = ctx.input.globalSecondaryIndexes.map(g => ({
          IndexName: g.indexName,
          KeySchema: g.keySchema.map(k => ({
            AttributeName: k.attributeName,
            KeyType: k.keyType
          })),
          Projection: {
            ProjectionType: g.projection.projectionType,
            ...(g.projection.nonKeyAttributes
              ? { NonKeyAttributes: g.projection.nonKeyAttributes }
              : {})
          },
          ...(g.provisionedThroughput
            ? {
                ProvisionedThroughput: {
                  ReadCapacityUnits: g.provisionedThroughput.readCapacityUnits,
                  WriteCapacityUnits: g.provisionedThroughput.writeCapacityUnits
                }
              }
            : {})
        }));
      }

      if (ctx.input.localSecondaryIndexes) {
        payload.LocalSecondaryIndexes = ctx.input.localSecondaryIndexes.map(l => ({
          IndexName: l.indexName,
          KeySchema: l.keySchema.map(k => ({
            AttributeName: k.attributeName,
            KeyType: k.keyType
          })),
          Projection: {
            ProjectionType: l.projection.projectionType,
            ...(l.projection.nonKeyAttributes
              ? { NonKeyAttributes: l.projection.nonKeyAttributes }
              : {})
          }
        }));
      }

      if (ctx.input.tags) {
        payload.Tags = ctx.input.tags.map(t => ({
          Key: t.key,
          Value: t.value
        }));
      }

      let result = await dynamo('CreateTable', payload);
      let tableDesc = result.TableDescription;

      return {
        output: {
          tableName: tableDesc.TableName,
          tableArn: tableDesc.TableArn,
          tableStatus: tableDesc.TableStatus
        },
        message: `Created table **${tableDesc.TableName}** (status: ${tableDesc.TableStatus})`
      };
    }

    // -----------------------------------------------------------------------
    // delete_table
    // -----------------------------------------------------------------------
    if (action === 'delete_table') {
      let result = await dynamo('DeleteTable', {
        TableName: requireInput(ctx.input.tableName, 'tableName')
      });
      let tableDesc = result.TableDescription;

      return {
        output: {
          tableName: tableDesc.TableName,
          tableStatus: tableDesc.TableStatus
        },
        message: `Table **${tableDesc.TableName}** is being deleted (status: ${tableDesc.TableStatus})`
      };
    }

    // -----------------------------------------------------------------------
    // put_item
    // -----------------------------------------------------------------------
    if (action === 'put_item') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName'),
        Item: toDynamoDBItem(requireInput(ctx.input.item, 'item'))
      };

      if (ctx.input.conditionExpression) {
        payload.ConditionExpression = ctx.input.conditionExpression;
      }
      if (ctx.input.expressionAttributeNames) {
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      }
      if (ctx.input.expressionAttributeValues) {
        payload.ExpressionAttributeValues = marshalExprValues(
          ctx.input.expressionAttributeValues
        );
      }
      if (ctx.input.returnOldItem) {
        payload.ReturnValues = 'ALL_OLD';
      }

      let result = await dynamo('PutItem', payload);
      let oldItem = result.Attributes ? fromDynamoDBItem(result.Attributes) : undefined;

      return {
        output: {
          success: true,
          oldItem
        },
        message: `Successfully put item into **${ctx.input.tableName}**${oldItem ? ' (replaced existing item)' : ''}`
      };
    }

    // -----------------------------------------------------------------------
    // get_item
    // -----------------------------------------------------------------------
    if (action === 'get_item') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName'),
        Key: marshalKey(requireInput(ctx.input.key, 'key'))
      };

      if (ctx.input.consistentRead) {
        payload.ConsistentRead = ctx.input.consistentRead;
      }
      if (ctx.input.projectionExpression) {
        payload.ProjectionExpression = ctx.input.projectionExpression;
      }
      if (ctx.input.expressionAttributeNames) {
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      }

      let result = await dynamo('GetItem', payload);
      let found = result.Item !== undefined && result.Item !== null;
      let item = found ? fromDynamoDBItem(result.Item) : undefined;

      return {
        output: {
          found,
          item
        },
        message: found
          ? `Found item in **${ctx.input.tableName}**`
          : `No item found in **${ctx.input.tableName}** for the given key`
      };
    }

    // -----------------------------------------------------------------------
    // update_item
    // -----------------------------------------------------------------------
    if (action === 'update_item') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName'),
        Key: marshalKey(requireInput(ctx.input.key, 'key')),
        UpdateExpression: requireInput(ctx.input.updateExpression, 'updateExpression'),
        ReturnValues: ctx.input.returnValues ?? 'ALL_NEW'
      };

      if (ctx.input.conditionExpression) {
        payload.ConditionExpression = ctx.input.conditionExpression;
      }
      if (ctx.input.expressionAttributeNames) {
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      }
      if (ctx.input.expressionAttributeValues) {
        payload.ExpressionAttributeValues = marshalExprValues(
          ctx.input.expressionAttributeValues
        );
      }

      let result = await dynamo('UpdateItem', payload);
      let updatedItem = result.Attributes ? fromDynamoDBItem(result.Attributes) : undefined;

      return {
        output: {
          success: true,
          updatedItem
        },
        message: `Successfully updated item in **${ctx.input.tableName}**`
      };
    }

    // -----------------------------------------------------------------------
    // query
    // -----------------------------------------------------------------------
    if (action === 'query') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName'),
        KeyConditionExpression: requireInput(
          ctx.input.keyConditionExpression,
          'keyConditionExpression'
        )
      };

      if (ctx.input.indexName) payload.IndexName = ctx.input.indexName;
      if (ctx.input.filterExpression) payload.FilterExpression = ctx.input.filterExpression;
      if (ctx.input.projectionExpression)
        payload.ProjectionExpression = ctx.input.projectionExpression;
      if (ctx.input.expressionAttributeNames)
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      if (ctx.input.expressionAttributeValues)
        payload.ExpressionAttributeValues = marshalExprValues(
          ctx.input.expressionAttributeValues
        );
      if (ctx.input.limit !== undefined) payload.Limit = ctx.input.limit;
      if (ctx.input.scanIndexForward !== undefined)
        payload.ScanIndexForward = ctx.input.scanIndexForward;
      if (ctx.input.consistentRead) payload.ConsistentRead = ctx.input.consistentRead;
      if (ctx.input.exclusiveStartKey)
        payload.ExclusiveStartKey = marshalKey(ctx.input.exclusiveStartKey);

      let result = await dynamo('Query', payload);
      let items = (result.Items ?? []).map(fromDynamoDBItem);
      let lastEvaluatedKey = result.LastEvaluatedKey
        ? fromDynamoDBItem(result.LastEvaluatedKey)
        : undefined;

      return {
        output: {
          items,
          count: result.Count ?? 0,
          scannedCount: result.ScannedCount ?? 0,
          lastEvaluatedKey
        },
        message: `Query returned **${result.Count ?? 0}** items from **${ctx.input.tableName}**${ctx.input.indexName ? ` (index: ${ctx.input.indexName})` : ''}${lastEvaluatedKey ? ' (more pages available)' : ''}`
      };
    }

    // -----------------------------------------------------------------------
    // scan
    // -----------------------------------------------------------------------
    if (action === 'scan') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName')
      };

      if (ctx.input.indexName) payload.IndexName = ctx.input.indexName;
      if (ctx.input.filterExpression) payload.FilterExpression = ctx.input.filterExpression;
      if (ctx.input.projectionExpression)
        payload.ProjectionExpression = ctx.input.projectionExpression;
      if (ctx.input.expressionAttributeNames)
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      if (ctx.input.expressionAttributeValues)
        payload.ExpressionAttributeValues = marshalExprValues(
          ctx.input.expressionAttributeValues
        );
      if (ctx.input.limit !== undefined) payload.Limit = ctx.input.limit;
      if (ctx.input.consistentRead) payload.ConsistentRead = ctx.input.consistentRead;
      if (ctx.input.exclusiveStartKey)
        payload.ExclusiveStartKey = marshalKey(ctx.input.exclusiveStartKey);

      let result = await dynamo('Scan', payload);
      let items = (result.Items ?? []).map(fromDynamoDBItem);
      let lastEvaluatedKey = result.LastEvaluatedKey
        ? fromDynamoDBItem(result.LastEvaluatedKey)
        : undefined;

      return {
        output: {
          items,
          count: result.Count ?? 0,
          scannedCount: result.ScannedCount ?? 0,
          lastEvaluatedKey
        },
        message: `Scan returned **${result.Count ?? 0}** items from **${ctx.input.tableName}** (scanned ${result.ScannedCount ?? 0})${lastEvaluatedKey ? ' (more pages available)' : ''}`
      };
    }

    // -----------------------------------------------------------------------
    // delete_item
    // -----------------------------------------------------------------------
    if (action === 'delete_item') {
      let payload: Record<string, any> = {
        TableName: requireInput(ctx.input.tableName, 'tableName'),
        Key: marshalKey(requireInput(ctx.input.key, 'key'))
      };

      if (ctx.input.conditionExpression) {
        payload.ConditionExpression = ctx.input.conditionExpression;
      }
      if (ctx.input.expressionAttributeNames) {
        payload.ExpressionAttributeNames = ctx.input.expressionAttributeNames;
      }
      if (ctx.input.expressionAttributeValues) {
        payload.ExpressionAttributeValues = marshalExprValues(
          ctx.input.expressionAttributeValues
        );
      }
      if (ctx.input.returnOldItem) {
        payload.ReturnValues = 'ALL_OLD';
      }

      let result = await dynamo('DeleteItem', payload);
      let oldItem = result.Attributes ? fromDynamoDBItem(result.Attributes) : undefined;

      return {
        output: {
          success: true,
          oldItem
        },
        message: `Successfully deleted item from **${ctx.input.tableName}**`
      };
    }

    throw awsServiceError(`Unknown action: ${action}`);
  })
  .build();
