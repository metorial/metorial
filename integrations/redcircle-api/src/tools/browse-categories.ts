import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let browseCategories = SlateTool.create(spec, {
  name: 'Browse Categories',
  key: 'browse_categories',
  description: `Browse and search Target's product category hierarchy. Retrieve root-level categories, child categories of a parent, search categories by name, or get products within a specific category. Use this to discover category IDs for filtering searches.`,
  instructions: [
    'Call with no parameters to get root-level categories.',
    'Provide parentId to get child categories under a specific parent.',
    'Provide searchTerm to search categories by name.',
    'Provide categoryId (and optional sorting/filtering) to get products listed in that category.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z
        .string()
        .optional()
        .describe(
          'Category ID to browse products within. When provided, returns products in this category.'
        ),
      parentId: z
        .string()
        .optional()
        .describe('Parent category ID to list child categories for.'),
      searchTerm: z.string().optional().describe('Search term to find categories by name.'),
      sortBy: z
        .enum([
          'best_seller',
          'price_high_to_low',
          'price_low_to_high',
          'best_match',
          'highest_rating',
          'newly_listed',
          'featured'
        ])
        .optional()
        .describe('Sort order for category product results.'),
      page: z.number().optional().describe('Page number for category product results.'),
      customerZipcode: z
        .string()
        .optional()
        .describe('US zipcode to localize category product results.')
    })
  )
  .output(
    z.object({
      categories: z
        .array(z.any())
        .optional()
        .describe('Array of categories with ID, name, path, and children indicator.'),
      currentCategory: z
        .any()
        .optional()
        .describe('Current category details when browsing by ID.'),
      parentCategory: z
        .any()
        .optional()
        .describe('Parent category when viewing child categories.'),
      categoryResults: z
        .array(z.any())
        .optional()
        .describe(
          'Products listed in the category (when categoryId is provided for product browsing).'
        ),
      pagination: z.any().optional().describe('Pagination info for category product results.'),
      facets: z
        .array(z.any())
        .optional()
        .describe('Available facets for filtering category product results.'),
      requestInfo: z.any().optional().describe('Request metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let isCategoryProductBrowse =
      ctx.input.categoryId && (ctx.input.sortBy || ctx.input.page || !ctx.input.parentId);

    // If user wants products within a category (not just the category list)
    if (isCategoryProductBrowse && !ctx.input.parentId && !ctx.input.searchTerm) {
      let params: Record<string, any> = { category_id: ctx.input.categoryId };
      if (ctx.input.sortBy) params.sort_by = ctx.input.sortBy;
      if (ctx.input.page) params.page = ctx.input.page;

      let zipcode = ctx.input.customerZipcode || ctx.config.customerZipcode;
      if (zipcode) params.customer_zipcode = zipcode;

      let data = await client.getCategoryProducts(params);

      let resultCount = data.category_results?.length ?? 0;

      return {
        output: {
          categoryResults: data.category_results ?? [],
          pagination: data.pagination,
          facets: data.facets,
          requestInfo: data.request_info
        },
        message: `Found **${resultCount}** products in category.`
      };
    }

    // Otherwise, list/search categories
    let params: Record<string, any> = {};
    if (ctx.input.categoryId && !ctx.input.parentId) params.id = ctx.input.categoryId;
    if (ctx.input.parentId) params.parent_id = ctx.input.parentId;
    if (ctx.input.searchTerm) params.search_term = ctx.input.searchTerm;

    let data = await client.listCategories(params);

    let categoryCount = data.categories?.length ?? 0;

    return {
      output: {
        categories: data.categories,
        currentCategory: data.current_category,
        parentCategory: data.parent_category,
        requestInfo: data.request_info
      },
      message: `Retrieved **${categoryCount}** categories${ctx.input.searchTerm ? ` matching "${ctx.input.searchTerm}"` : ''}.`
    };
  })
  .build();
