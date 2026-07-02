import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';
import {
  callAnalyticsRuleSchema,
  requireString,
  tagSchema,
  validateCallAnalyticsRules
} from './common';

let categoryOutputSchema = z.object({
  categoryName: z.string().describe('Name of the Call Analytics category'),
  inputType: z.string().optional().describe('Category input type'),
  createTime: z.number().optional().describe('Unix timestamp when created'),
  lastUpdateTime: z.number().optional().describe('Unix timestamp when last updated'),
  rules: z
    .array(z.record(z.string(), z.any()))
    .optional()
    .describe('AWS Call Analytics category rules'),
  tags: z.array(tagSchema).optional().describe('Tags attached to the category')
});

let mapCategory = (category: any) => ({
  categoryName: category.CategoryName,
  inputType: category.InputType,
  createTime: category.CreateTime,
  lastUpdateTime: category.LastUpdateTime,
  rules: category.Rules,
  tags: (category.Tags || []).map((tag: any) => ({
    key: tag.Key,
    value: tag.Value
  }))
});

export let manageCallAnalyticsCategory = SlateTool.create(spec, {
  name: 'Manage Call Analytics Category',
  key: 'manage_call_analytics_category',
  description:
    'Create, update, get, delete, or list Call Analytics categories. Categories define rule-based labels that AWS applies to Call Analytics jobs created after the category exists.',
  instructions: [
    'For create and update, provide 1-20 rules. Each rule uses ruleType to select one AWS rule member.',
    'Categories are applied only to Call Analytics jobs created after the category exists.',
    'For get and delete, only categoryName is required. For list, all parameters are optional.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list'])
        .describe('Action to perform on the Call Analytics category'),
      categoryName: z
        .string()
        .optional()
        .describe('Category name. Required for create, update, get, and delete.'),
      inputType: z
        .enum(['POST_CALL', 'REAL_TIME'])
        .optional()
        .describe('Whether this category applies to post-call or real-time analytics'),
      rules: z
        .array(callAnalyticsRuleSchema)
        .optional()
        .describe('Rules for create and update. Each rule must match its ruleType.'),
      tags: z.array(tagSchema).optional().describe('Tags for the category on create'),
      maxResults: z.number().optional().describe('Max results to return for list (1-100)'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      category: categoryOutputSchema.optional().describe('Category details'),
      categories: z
        .array(categoryOutputSchema)
        .optional()
        .describe('Category details returned by list'),
      categoryName: z.string().optional().describe('Category name'),
      deleted: z.boolean().optional().describe('Whether the category was deleted'),
      nextToken: z.string().optional().describe('Pagination token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let categoryName = requireString(
        ctx.input.categoryName,
        'categoryName is required for create.'
      );
      let rules = validateCallAnalyticsRules(ctx.input.rules);
      let result = await client.createCallAnalyticsCategory({
        categoryName,
        inputType: ctx.input.inputType,
        rules,
        tags: ctx.input.tags
      });
      let category = mapCategory(result.CategoryProperties);

      return {
        output: {
          category,
          categoryName: category.categoryName
        },
        message: `Created Call Analytics category **${category.categoryName}**.`
      };
    }

    if (action === 'update') {
      let categoryName = requireString(
        ctx.input.categoryName,
        'categoryName is required for update.'
      );
      let rules = validateCallAnalyticsRules(ctx.input.rules);
      let result = await client.updateCallAnalyticsCategory({
        categoryName,
        inputType: ctx.input.inputType,
        rules
      });
      let category = mapCategory(result.CategoryProperties);

      return {
        output: {
          category,
          categoryName: category.categoryName
        },
        message: `Updated Call Analytics category **${category.categoryName}**.`
      };
    }

    if (action === 'get') {
      let categoryName = requireString(
        ctx.input.categoryName,
        'categoryName is required for get.'
      );
      let result = await client.getCallAnalyticsCategory(categoryName);
      let category = mapCategory(result.CategoryProperties);

      return {
        output: {
          category,
          categoryName: category.categoryName
        },
        message: `Retrieved Call Analytics category **${category.categoryName}**.`
      };
    }

    if (action === 'delete') {
      let categoryName = requireString(
        ctx.input.categoryName,
        'categoryName is required for delete.'
      );
      await client.deleteCallAnalyticsCategory(categoryName);

      return {
        output: {
          categoryName,
          deleted: true
        },
        message: `Deleted Call Analytics category **${categoryName}**.`
      };
    }

    let result = await client.listCallAnalyticsCategories({
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });
    let categories = (result.Categories || []).map(mapCategory);

    return {
      output: {
        categories,
        nextToken: result.NextToken
      },
      message: `Found **${categories.length}** Call Analytics categor${categories.length === 1 ? 'y' : 'ies'}.`
    };
  });
