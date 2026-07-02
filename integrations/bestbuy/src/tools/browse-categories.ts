import { SlateTool } from 'slates';
import { z } from 'zod';
import { BestBuyClient } from '../lib/client';
import { spec } from '../spec';

export let browseCategories = SlateTool.create(spec, {
  name: 'Browse Categories',
  key: 'browse_categories',
  description: `Browse and search Best Buy product categories. Returns category hierarchy including IDs, names, paths, and subcategories. Useful for discovering category IDs to use with product searches and recommendations.`,
  instructions: [
    'Use query to filter categories, e.g. "name=TVs*" for wildcard name matching or "id=abcat0101000" for a specific category.',
    'Leave query empty to browse top-level categories.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Category filter query, e.g. "name=Laptops*" or "id=abcat0502000"'),
      show: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return, e.g. "id,name,url,path,subCategories"'
        ),
      page: z.number().optional().describe('Page number (starts at 1)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 10)')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching categories'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      categories: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Array of category objects with hierarchy information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BestBuyClient({ token: ctx.auth.token });

    let result = await client.searchCategories({
      query: ctx.input.query,
      show: ctx.input.show,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        total: result.total,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        categories: result.categories
      },
      message: `Found **${result.total}** categories (page ${result.currentPage} of ${result.totalPages}, showing ${result.categories.length} results).`
    };
  })
  .build();
