import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let attributeValueSchema: z.ZodType<any> = z.lazy(() =>
  z
    .object({
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
    .describe(
      'DynamoDB attribute value in JSON format. Use {S: "value"} for strings, {N: "123"} for numbers, {BOOL: true} for booleans, etc.'
    )
);

export let putItem = SlateTool.create(spec, {
  name: 'Put Item',
  key: 'put_item',
  description: `Create or replace an item in a DynamoDB table. The entire item is replaced if an item with the same primary key exists.
Use DynamoDB JSON format for attribute values (e.g., \`{"S": "hello"}\` for strings, \`{"N": "42"}\` for numbers).
Supports conditional writes via condition expressions.`,
  instructions: [
    'Attribute values must use DynamoDB JSON format: {"S": "string"}, {"N": "123"}, {"BOOL": true}, {"L": [...]}, {"M": {...}}, {"NULL": true}',
    'Numbers must be passed as strings inside the N type: {"N": "42.5"}'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      tableName: z.string().describe('Name of the table'),
      item: z
        .record(z.string(), attributeValueSchema)
        .describe('Item to put in DynamoDB JSON format'),
      conditionExpression: z
        .string()
        .optional()
        .describe('Condition that must be met for the put to succeed'),
      expressionAttributeNames: z
        .record(z.string(), z.string())
        .optional()
        .describe('Substitution tokens for attribute names in expressions'),
      expressionAttributeValues: z
        .record(z.string(), attributeValueSchema)
        .optional()
        .describe('Substitution tokens for attribute values in expressions'),
      returnOldItem: z
        .boolean()
        .optional()
        .default(false)
        .describe('Return the old item if it was replaced')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      oldItem: z
        .record(z.string(), z.any())
        .optional()
        .describe('Previous item if returnOldItem was true and item existed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let result = await client.putItem({
      tableName: ctx.input.tableName,
      item: ctx.input.item,
      conditionExpression: ctx.input.conditionExpression,
      expressionAttributeNames: ctx.input.expressionAttributeNames,
      expressionAttributeValues: ctx.input.expressionAttributeValues,
      returnValues: ctx.input.returnOldItem ? 'ALL_OLD' : 'NONE'
    });

    return {
      output: {
        success: true,
        oldItem: result.Attributes
      },
      message: `Successfully put item into **${ctx.input.tableName}**${result.Attributes ? ' (replaced existing item)' : ''}`
    };
  })
  .build();
