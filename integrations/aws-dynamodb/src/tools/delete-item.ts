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

export let deleteItem = SlateTool.create(spec, {
  name: 'Delete Item',
  key: 'delete_item',
  description: `Delete a single item from a DynamoDB table by its primary key. Supports conditional deletes and optionally returns the deleted item.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table'),
      key: z
        .record(z.string(), attributeValueSchema)
        .describe('Primary key of the item to delete in DynamoDB JSON format'),
      conditionExpression: z
        .string()
        .optional()
        .describe('Condition that must be met for the delete to succeed'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for attribute names'),
      expressionAttributeValues: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Substitution tokens for attribute values'),
      returnDeletedItem: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return the deleted item')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      deletedItem: z
        .record(z.string(), z.any())
        .optional()
        .describe('The deleted item if returnDeletedItem was true')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.deleteItem({
      tableName: ctx.input.tableName,
      key: ctx.input.key,
      conditionExpression: ctx.input.conditionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames,
      expressionAttributeValues: ctx.input.expressionAttributeValues,
      returnValues: ctx.input.returnDeletedItem ? 'ALL_OLD' : 'NONE'
    });

    return {
      output: {
        success: true,
        deletedItem: result.Attributes
      },
      message: `Successfully deleted item from **${ctx.input.tableName}**`
    };
  })
  .build();
