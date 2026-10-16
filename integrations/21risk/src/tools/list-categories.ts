import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let categorySchema = z
  .object({
    categoryId: z.string().optional().describe('Unique identifier of the category'),
    name: z.string().optional().describe('Name of the category'),
    riskModelId: z.string().optional().describe('ID of the parent risk model')
  })
  .passthrough();

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve risk model categories from 21RISK. Categories define the question groups within risk models and contain various question types used in compliance checklists. Use $filter to get categories for a specific risk model.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      nextLink: z
        .string()
        .optional()
        .describe(
          'Continuation URL returned by this tool. Supply it alone to retrieve the next page.'
        ),
      filter: z
        .string()
        .optional()
        .describe('OData $filter expression (e.g., "RiskModelId eq 123")'),
      select: z.string().optional().describe('Comma-separated list of fields to return'),
      expand: z.string().optional().describe('Related entities to expand'),
      orderby: z.string().optional().describe('Sort order'),
      top: z.number().optional().describe('Maximum number of records to return'),
      skip: z.number().optional().describe('Number of records to skip for pagination')
    })
  )
  .output(
    z.object({
      categories: z.array(categorySchema).describe('List of categories'),
      nextLink: z
        .string()
        .optional()
        .describe('Provider continuation URL for the next page, when supplied'),
      totalCount: z
        .number()
        .optional()
        .describe('Provider total matching count, when supplied'),
      count: z.number().describe('Number of categories returned in this page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let categories = await client.getCategories({
      nextLink: ctx.input.nextLink,
      filter: ctx.input.filter,
      select: ctx.input.select,
      expand: ctx.input.expand,
      orderby: ctx.input.orderby,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    let results = categories.records;

    return {
      output: {
        categories: results,
        count: results.length,
        nextLink: categories.nextLink,
        totalCount: categories.totalCount
      },
      message: `Retrieved **${results.length}** category record(s).`
    };
  })
  .build();
