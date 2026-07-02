import { SlateTool } from 'slates';
import { z } from 'zod';
import { lambdaServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `List, add, or remove tags on a Lambda function. Tags are key-value pairs used for organization, cost allocation, and access control. Provide the full function ARN for tag operations.`,
  instructions: [
    'Use **action** "list" to view tags, "add" to set tags, or "remove" to delete tag keys.',
    'The resourceArn must be the full function ARN (e.g., arn:aws:lambda:us-east-1:123456789012:function:my-func).'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'remove']).describe('Operation to perform'),
      resourceArn: z.string().describe('Full ARN of the Lambda resource'),
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Tags to add as key-value pairs (for add action)'),
      tagKeys: z
        .array(z.string())
        .optional()
        .describe('Tag keys to remove (for remove action)')
    })
  )
  .output(
    z.object({
      tags: z
        .record(z.string(), z.string())
        .optional()
        .describe('Current tags on the resource'),
      updated: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let { action, resourceArn } = ctx.input;

    if (action === 'list') {
      let result = await client.listTags(resourceArn);
      return {
        output: { tags: result.Tags || {} },
        message: `Found **${Object.keys(result.Tags || {}).length}** tag(s).`
      };
    }

    if (action === 'add') {
      if (!ctx.input.tags || Object.keys(ctx.input.tags).length === 0) {
        throw lambdaServiceError('tags are required for the add action');
      }
      await client.tagResource(resourceArn, ctx.input.tags);
      return {
        output: { updated: true, tags: ctx.input.tags },
        message: `Added **${Object.keys(ctx.input.tags).length}** tag(s) to the resource.`
      };
    }

    // remove
    if (!ctx.input.tagKeys || ctx.input.tagKeys.length === 0) {
      throw lambdaServiceError('tagKeys are required for the remove action');
    }
    await client.untagResource(resourceArn, ctx.input.tagKeys);
    return {
      output: { updated: true },
      message: `Removed **${ctx.input.tagKeys.length}** tag(s) from the resource.`
    };
  })
  .build();
