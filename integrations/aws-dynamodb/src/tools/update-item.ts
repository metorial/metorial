import { SlateTool } from 'slates';
import { z } from 'zod';
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

export let updateItem = SlateTool.create(spec, {
  name: 'Update Item',
  key: 'update_item',
  description: `Update specific attributes of an existing item in a DynamoDB table using update expressions.
Unlike PutItem, this modifies only the specified attributes without replacing the entire item.
Supports SET, REMOVE, ADD, and DELETE operations within update expressions, and conditional updates.`,
  instructions: [
    'Use SET to modify attributes: "SET #name = :val"',
    'Use REMOVE to delete attributes: "REMOVE #attr"',
    'Use ADD for numeric increment or set append: "ADD #count :increment"',
    'Use DELETE to remove elements from a set: "DELETE #tags :toRemove"'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table'),
      key: z
        .record(z.string(), attributeValueSchema)
        .describe('Primary key of the item in DynamoDB JSON format'),
      updateExpression: z
        .string()
        .describe('Update expression (e.g., "SET #name = :val, #age = :age REMOVE #oldAttr")'),
      conditionExpression: z
        .string()
        .optional()
        .describe('Condition that must be met for the update to succeed'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for attribute names'),
      expressionAttributeValues: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Substitution tokens for attribute values'),
      returnValues: z
        .enum(['NONE', 'UPDATED_OLD', 'UPDATED_NEW', 'ALL_OLD', 'ALL_NEW'])
        .optional()
        .default('ALL_NEW')
        .describe('What to return after the update')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Item attributes based on returnValues setting')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.updateItem({
      tableName: ctx.input.tableName,
      key: ctx.input.key,
      updateExpression: ctx.input.updateExpression,
      conditionExpression: ctx.input.conditionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames,
      expressionAttributeValues: ctx.input.expressionAttributeValues,
      returnValues: ctx.input.returnValues
    });

    return {
      output: {
        success: true,
        attributes: result.Attributes
      },
      message: `Successfully updated item in **${ctx.input.tableName}**`
    };
  })
  .build();
