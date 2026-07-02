import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categoryInputSchema = z.object({
  categoryId: z.string().describe('Unique identifier for the category within the classifier'),
  label: z.string().optional().describe('Human-readable category name'),
  query: z
    .string()
    .describe(
      'Concept query defining the category (similar to boolean search engine queries over semantic meaning)'
    )
});

let categoryOutputSchema = z.object({
  categoryId: z.string().describe('Unique identifier for the category'),
  label: z.string().optional().describe('Human-readable category name'),
  query: z.string().optional().describe('Concept query defining the category')
});

export let manageClassifier = SlateTool.create(spec, {
  name: 'Manage Classifier',
  key: 'manage_classifier',
  description: `Create, delete, or browse custom classifiers and their categories. Custom classifiers let you define your own document classification taxonomy using concept queries.
Use this to build domain-specific classifiers that categorize documents into custom categories beyond the built-in IAB and IPTC taxonomies.`,
  instructions: [
    'Use "create" to create a new classifier with an array of categories. Each category needs a categoryId and a concept query.',
    'Use "list_categories" to browse categories within a classifier with pagination. Use "get_category" or "delete_category" for individual category operations.',
    'Use "delete" to remove an entire classifier.'
  ],
  constraints: [
    'Free accounts: 1 classifier with 50 categories max. Paid plans: up to 10 classifiers with 1,000 total categories.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'list_categories', 'get_category', 'delete_category'])
        .describe('Operation to perform'),
      classifierId: z.string().describe('Classifier ID to operate on'),
      categories: z
        .array(categoryInputSchema)
        .optional()
        .describe('Categories to create (for create action)'),
      categoryId: z
        .string()
        .optional()
        .describe('Category ID (required for get_category and delete_category actions)'),
      limit: z
        .number()
        .optional()
        .describe('Number of categories to return for list_categories (default: 20)'),
      offset: z
        .number()
        .optional()
        .describe('Offset for pagination in list_categories (default: 0)')
    })
  )
  .output(
    z.object({
      categories: z
        .array(categoryOutputSchema)
        .optional()
        .describe('List of categories (for list_categories action)'),
      category: categoryOutputSchema
        .optional()
        .describe('Single category (for get_category action)'),
      total: z
        .number()
        .optional()
        .describe('Total number of categories (for list_categories action)'),
      createdCount: z
        .number()
        .optional()
        .describe('Number of categories created (for create action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, classifierId, categories, categoryId, limit, offset } = ctx.input;

    if (action === 'create') {
      if (!categories || categories.length === 0) {
        throw new Error('At least one category is required for the create action.');
      }
      await client.createClassifier(classifierId, categories);
      return {
        output: { createdCount: categories.length },
        message: `Created classifier **${classifierId}** with **${categories.length}** categories.`
      };
    }

    if (action === 'delete') {
      await client.deleteClassifier(classifierId);
      return {
        output: {},
        message: `Deleted classifier **${classifierId}**.`
      };
    }

    if (action === 'list_categories') {
      let result = await client.listClassifierCategories(
        classifierId,
        limit ?? 20,
        offset ?? 0
      );
      return {
        output: { categories: result.categories, total: result.total },
        message: `Showing **${result.categories.length}** of **${result.total}** categories in classifier **${classifierId}**.`
      };
    }

    if (action === 'get_category') {
      if (!categoryId) {
        throw new Error('categoryId is required for the get_category action.');
      }
      let category = await client.getClassifierCategory(classifierId, categoryId);
      return {
        output: { category },
        message: `Retrieved category **${categoryId}** from classifier **${classifierId}**.`
      };
    }

    if (action === 'delete_category') {
      if (!categoryId) {
        throw new Error('categoryId is required for the delete_category action.');
      }
      await client.deleteClassifierCategory(classifierId, categoryId);
      return {
        output: {},
        message: `Deleted category **${categoryId}** from classifier **${classifierId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
