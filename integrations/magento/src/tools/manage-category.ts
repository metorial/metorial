import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let categoryOutputSchema = z.object({
  categoryId: z.number().optional().describe('Category ID'),
  parentId: z.number().optional().describe('Parent category ID'),
  name: z.string().optional().describe('Category name'),
  isActive: z.boolean().optional().describe('Whether the category is enabled'),
  position: z.number().optional().describe('Sort position'),
  level: z.number().optional().describe('Category depth level'),
  productCount: z.number().optional().describe('Number of products in this category'),
  path: z.string().optional().describe('Category path (e.g. 1/2/5)'),
  includeInMenu: z.boolean().optional().describe('Whether to show in navigation menu'),
  childrenCount: z.number().optional().describe('Number of direct child categories'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapCategory = (c: any): Record<string, any> => ({
  categoryId: c.id,
  parentId: c.parent_id,
  name: c.name,
  isActive: c.is_active,
  position: c.position,
  level: c.level,
  productCount: c.product_count,
  path: c.path,
  includeInMenu: c.include_in_menu,
  childrenCount: c.children_data?.length,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

export let manageCategory = SlateTool.create(spec, {
  name: 'Manage Category',
  key: 'manage_category',
  description: `Create, update, retrieve, or delete product categories. View the full category tree or manage individual categories. Assign and remove products from categories.`,
  instructions: [
    'To **get the full tree**, set action to "get_tree" (no categoryId needed).',
    'To **get a single category**, set action to "get" with a categoryId.',
    'To **create**, set action to "create" with name, parentId, and isActive.',
    'To **update**, set action to "update" with categoryId and fields to change.',
    'To **delete**, set action to "delete" with categoryId.',
    'To **assign a product**, set action to "assign_product" with categoryId and productSku.',
    'To **remove a product**, set action to "remove_product" with categoryId and productSku.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'get_tree',
          'get',
          'create',
          'update',
          'delete',
          'assign_product',
          'remove_product'
        ])
        .describe('Category operation'),
      categoryId: z
        .number()
        .optional()
        .describe('Category ID (for get, update, delete, assign_product, remove_product)'),
      name: z.string().optional().describe('Category name'),
      parentId: z.number().optional().describe('Parent category ID'),
      isActive: z.boolean().optional().describe('Whether the category is enabled'),
      position: z.number().optional().describe('Sort position'),
      includeInMenu: z.boolean().optional().describe('Whether to include in navigation menu'),
      productSku: z
        .string()
        .optional()
        .describe('Product SKU (for assign_product, remove_product)'),
      productPosition: z
        .number()
        .optional()
        .describe('Product position within the category (for assign_product)')
    })
  )
  .output(
    z.object({
      category: categoryOutputSchema.optional().describe('Category details'),
      tree: z.any().optional().describe('Full category tree (for get_tree)'),
      deleted: z.boolean().optional().describe('Whether the category was deleted'),
      success: z.boolean().optional().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    if (ctx.input.action === 'get_tree') {
      let tree = await client.getCategoryTree();
      return {
        output: { tree: mapCategory(tree) },
        message: `Retrieved category tree starting from **${tree.name}**.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for get action');
      let category = await client.getCategory(ctx.input.categoryId);
      return {
        output: { category: mapCategory(category) },
        message: `Retrieved category **${category.name}** (ID: ${category.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for delete action');
      await client.deleteCategory(ctx.input.categoryId);
      return {
        output: { deleted: true },
        message: `Deleted category \`${ctx.input.categoryId}\`.`
      };
    }

    if (ctx.input.action === 'assign_product') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for assign_product');
      if (!ctx.input.productSku) throw new Error('productSku is required for assign_product');
      await client.assignProductToCategory(
        ctx.input.categoryId,
        ctx.input.productSku,
        ctx.input.productPosition
      );
      return {
        output: { success: true },
        message: `Assigned product \`${ctx.input.productSku}\` to category \`${ctx.input.categoryId}\`.`
      };
    }

    if (ctx.input.action === 'remove_product') {
      if (!ctx.input.categoryId) throw new Error('categoryId is required for remove_product');
      if (!ctx.input.productSku) throw new Error('productSku is required for remove_product');
      await client.removeProductFromCategory(ctx.input.categoryId, ctx.input.productSku);
      return {
        output: { success: true },
        message: `Removed product \`${ctx.input.productSku}\` from category \`${ctx.input.categoryId}\`.`
      };
    }

    let categoryData: Record<string, any> = {};
    if (ctx.input.name !== undefined) categoryData.name = ctx.input.name;
    if (ctx.input.parentId !== undefined) categoryData.parent_id = ctx.input.parentId;
    if (ctx.input.isActive !== undefined) categoryData.is_active = ctx.input.isActive;
    if (ctx.input.position !== undefined) categoryData.position = ctx.input.position;
    if (ctx.input.includeInMenu !== undefined)
      categoryData.include_in_menu = ctx.input.includeInMenu;

    if (ctx.input.action === 'create') {
      let category = await client.createCategory(categoryData);
      return {
        output: { category: mapCategory(category) },
        message: `Created category **${category.name}** (ID: ${category.id}).`
      };
    }

    // update
    if (!ctx.input.categoryId) throw new Error('categoryId is required for update action');
    let category = await client.updateCategory(ctx.input.categoryId, categoryData);
    return {
      output: { category: mapCategory(category) },
      message: `Updated category **${category.name}**.`
    };
  })
  .build();
