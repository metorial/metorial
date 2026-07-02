import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageCategory = SlateTool.create(spec, {
  name: 'Manage Category',
  key: 'manage_category',
  description: `List, create, update, or delete product categories. Categories organize products in the catalog and can be nested in a tree structure.`,
  instructions: [
    'Use action "list" to retrieve categories with optional filtering.',
    'Use action "create" to create a new category with a name and tree/parent.',
    'Use action "update" to modify an existing category.',
    'Use action "delete" to remove a category by ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      categoryId: z.number().optional().describe('Category ID (required for update/delete)'),
      name: z.string().optional().describe('Category name (required for create)'),
      parentId: z.number().optional().describe('Parent category ID (0 for top-level)'),
      treeId: z.number().optional().describe('Category tree ID'),
      description: z.string().optional().describe('Category description'),
      isVisible: z.boolean().optional().describe('Whether the category is visible'),
      sortOrder: z.number().optional().describe('Sort order for the category'),
      pageTitle: z.string().optional().describe('SEO page title'),
      searchKeywords: z.string().optional().describe('Comma-separated search keywords'),
      imageUrl: z.string().optional().describe('URL for the category image'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      category: z.any().optional().describe('The created or updated category'),
      categories: z.array(z.any()).optional().describe('List of categories'),
      deleted: z.boolean().optional().describe('Whether the category was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.parentId !== undefined) params.parent_id = ctx.input.parentId;
      if (ctx.input.treeId) params.tree_id = ctx.input.treeId;
      if (ctx.input.name) params.name = ctx.input.name;
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      let result = await client.listCategories(params);
      return {
        output: { categories: result.data },
        message: `Found ${result.data.length} categories.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.categoryId)
        throw bigcommerceServiceError('categoryId is required for delete');
      await client.deleteCategory(ctx.input.categoryId);
      return {
        output: { deleted: true },
        message: `Deleted category with ID ${ctx.input.categoryId}.`
      };
    }

    let categoryData: Record<string, any> = {};
    if (ctx.input.name) categoryData.name = ctx.input.name;
    if (ctx.input.parentId !== undefined) categoryData.parent_id = ctx.input.parentId;
    if (ctx.input.treeId) categoryData.tree_id = ctx.input.treeId;
    if (ctx.input.description) categoryData.description = ctx.input.description;
    if (ctx.input.isVisible !== undefined) categoryData.is_visible = ctx.input.isVisible;
    if (ctx.input.sortOrder !== undefined) categoryData.sort_order = ctx.input.sortOrder;
    if (ctx.input.pageTitle) categoryData.page_title = ctx.input.pageTitle;
    if (ctx.input.searchKeywords) categoryData.search_keywords = ctx.input.searchKeywords;
    if (ctx.input.imageUrl) categoryData.image_url = ctx.input.imageUrl;

    if (ctx.input.action === 'create') {
      let result = await client.createCategory(categoryData);
      let cat = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: { category: cat },
        message: `Created category **${cat.name}** (ID: ${cat.category_id}).`
      };
    }

    if (!ctx.input.categoryId)
      throw bigcommerceServiceError('categoryId is required for update');
    categoryData.category_id = ctx.input.categoryId;
    let result = await client.updateCategory(categoryData);
    let cat = Array.isArray(result.data) ? result.data[0] : result.data;
    return {
      output: { category: cat },
      message: `Updated category **${cat.name}** (ID: ${cat.category_id}).`
    };
  })
  .build();
