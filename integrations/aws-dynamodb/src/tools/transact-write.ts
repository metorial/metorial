import { SlateTool } from 'slates';
import { z } from 'zod';
import { dynamoDbServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let attributeValueSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    S: z.string().optional(),
    N: z.string().optional(),
    B: z.string().optional(),
    SS: z.array(z.string()).optional(),
    NS: z.array(z.string()).optional(),
    BS: z.array(z.string()).optional(),
    M: z.record(z.string(), attributeValueSchema).optional(),
    L: z.array(attributeValueSchema).optional(),
    NULL: z.boolean().optional(),
    BOOL: z.boolean().optional()
  })
);

let expressionFields = {
  conditionExpression: z.string().optional().describe('Condition expression'),
  expressionAttributeNames: z
    .record(z.string(), z.string())
    .optional()
    .describe('Attribute name substitutions'),
  expressionAttributeValues: z
    .record(z.string(), attributeValueSchema)
    .optional()
    .describe('Attribute value substitutions')
};

export let transactWrite = SlateTool.create(spec, {
  name: 'Transact Write Items',
  key: 'transact_write_items',
  description: `Execute a transactional write with up to 100 actions across one or more DynamoDB tables.
All actions succeed or all fail together (ACID). Supports Put, Update, Delete, and ConditionCheck operations within a single transaction.`,
  constraints: [
    'Maximum 100 actions per transaction',
    'All items must be in the same AWS region',
    'Two actions cannot target the same item'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      transactItems: z
        .array(
          z.object({
            put: z
              .object({
                tableName: z.string(),
                item: z.record(z.string(), attributeValueSchema),
                ...expressionFields
              })
              .optional()
              .describe('Put an item'),
            update: z
              .object({
                tableName: z.string(),
                key: z.record(z.string(), attributeValueSchema),
                updateExpression: z.string(),
                ...expressionFields
              })
              .optional()
              .describe('Update an item'),
            delete: z
              .object({
                tableName: z.string(),
                key: z.record(z.string(), attributeValueSchema),
                ...expressionFields
              })
              .optional()
              .describe('Delete an item'),
            conditionCheck: z
              .object({
                tableName: z.string(),
                key: z.record(z.string(), attributeValueSchema),
                conditionExpression: z.string(),
                expressionAttributeNames: z.record(z.string(), z.string()).optional(),
                expressionAttributeValues: z
                  .record(z.string(), attributeValueSchema)
                  .optional()
              })
              .optional()
              .describe('Check a condition without modifying the item')
          })
        )
        .min(1)
        .max(100)
        .describe(
          'Transaction operations (each object should have exactly one of: put, update, delete, conditionCheck)'
        ),
      clientRequestToken: z
        .string()
        .optional()
        .describe('Idempotency token to prevent duplicate transactions')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the transaction succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let transactItems = ctx.input.transactItems.map((item, index) => {
      let actionCount =
        (item.put ? 1 : 0) +
        (item.update ? 1 : 0) +
        (item.delete ? 1 : 0) +
        (item.conditionCheck ? 1 : 0);
      if (actionCount !== 1) {
        throw dynamoDbServiceError(
          `Transaction item ${index + 1} must include exactly one of put, update, delete, or conditionCheck.`
        );
      }

      let result: any = {};
      if (item.put) {
        result.Put = {
          TableName: item.put.tableName,
          Item: item.put.item,
          ...(item.put.conditionExpression && {
            ConditionExpression: item.put.conditionExpression
          }),
          ...(item.put.expressionAttributeNames && {
            ExpressionAttributeNames: item.put.expressionAttributeNames
          }),
          ...(item.put.expressionAttributeValues && {
            ExpressionAttributeValues: item.put.expressionAttributeValues
          })
        };
      }
      if (item.update) {
        result.Update = {
          TableName: item.update.tableName,
          Key: item.update.key,
          UpdateExpression: item.update.updateExpression,
          ...(item.update.conditionExpression && {
            ConditionExpression: item.update.conditionExpression
          }),
          ...(item.update.expressionAttributeNames && {
            ExpressionAttributeNames: item.update.expressionAttributeNames
          }),
          ...(item.update.expressionAttributeValues && {
            ExpressionAttributeValues: item.update.expressionAttributeValues
          })
        };
      }
      if (item.delete) {
        result.Delete = {
          TableName: item.delete.tableName,
          Key: item.delete.key,
          ...(item.delete.conditionExpression && {
            ConditionExpression: item.delete.conditionExpression
          }),
          ...(item.delete.expressionAttributeNames && {
            ExpressionAttributeNames: item.delete.expressionAttributeNames
          }),
          ...(item.delete.expressionAttributeValues && {
            ExpressionAttributeValues: item.delete.expressionAttributeValues
          })
        };
      }
      if (item.conditionCheck) {
        result.ConditionCheck = {
          TableName: item.conditionCheck.tableName,
          Key: item.conditionCheck.key,
          ConditionExpression: item.conditionCheck.conditionExpression,
          ...(item.conditionCheck.expressionAttributeNames && {
            ExpressionAttributeNames: item.conditionCheck.expressionAttributeNames
          }),
          ...(item.conditionCheck.expressionAttributeValues && {
            ExpressionAttributeValues: item.conditionCheck.expressionAttributeValues
          })
        };
      }
      return result;
    });

    await client.transactWriteItems({
      transactItems,
      clientRequestToken: ctx.input.clientRequestToken
    });

    return {
      output: {
        success: true
      },
      message: `Transaction with **${ctx.input.transactItems.length}** operations completed successfully`
    };
  })
  .build();
