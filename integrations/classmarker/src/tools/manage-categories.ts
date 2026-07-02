import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClassMarkerClient } from '../lib/client';
import { spec } from '../spec';

// ── List Categories ──

let subcategorySchema = z.object({
  categoryId: z.number().describe('Unique identifier of the subcategory'),
  categoryName: z.string().describe('Name of the subcategory'),
  parentCategoryId: z.number().describe('ID of the parent category')
});

let parentCategorySchema = z.object({
  parentCategoryId: z.number().describe('Unique identifier of the parent category'),
  parentCategoryName: z.string().describe('Name of the parent category'),
  categories: z.array(subcategorySchema).describe('Subcategories within this parent category')
});

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all question categories organized as parent categories with their subcategories. Useful for organizing questions and understanding the category hierarchy.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      parentCategories: z
        .array(parentCategorySchema)
        .describe('List of parent categories with subcategories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let data = await client.getCategories();
    let rawParents = data?.data?.parent_categories || [];

    let parentCategories = rawParents.map((p: any) => ({
      parentCategoryId: p.parent_category_id,
      parentCategoryName: p.parent_category_name,
      categories: (p.categories || []).map((c: any) => ({
        categoryId: c.category_id,
        categoryName: c.category_name,
        parentCategoryId: c.parent_category_id
      }))
    }));

    return {
      output: { parentCategories },
      message: `Found **${parentCategories.length}** parent category(ies).`
    };
  })
  .build();

// ── Create/Update Category ──

export let manageCategory = SlateTool.create(spec, {
  name: 'Create or Update Category',
  key: 'manage_category',
  description: `Create or update a question category. Supports both parent categories and subcategories. Use \`action\` to specify whether to create or update, and \`level\` to specify whether it's a parent category or subcategory.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update'])
        .describe('Whether to create a new category or update an existing one'),
      level: z
        .enum(['parent', 'subcategory'])
        .describe('Whether this is a parent category or subcategory'),
      name: z.string().describe('Name of the category'),
      parentCategoryId: z
        .number()
        .optional()
        .describe(
          'Required when creating a subcategory or updating a parent category. For subcategories, the parent to assign it to. For updating parents, the ID of the parent to update.'
        ),
      categoryId: z
        .number()
        .optional()
        .describe('Required when updating a subcategory. The ID of the subcategory to update.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Status of the operation'),
      response: z.any().describe('Full response from ClassMarker')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClassMarkerClient({
      token: ctx.auth.token,
      apiSecret: ctx.auth.apiSecret
    });

    let { action, level, name, parentCategoryId, categoryId } = ctx.input;
    let data: any;

    if (action === 'create' && level === 'parent') {
      data = await client.createParentCategory(name);
    } else if (action === 'create' && level === 'subcategory') {
      if (!parentCategoryId) {
        throw new Error('parentCategoryId is required when creating a subcategory');
      }
      data = await client.createSubcategory(name, parentCategoryId);
    } else if (action === 'update' && level === 'parent') {
      if (!parentCategoryId) {
        throw new Error('parentCategoryId is required when updating a parent category');
      }
      data = await client.updateParentCategory(parentCategoryId, name);
    } else if (action === 'update' && level === 'subcategory') {
      if (!categoryId) {
        throw new Error('categoryId is required when updating a subcategory');
      }
      data = await client.updateSubcategory(categoryId, {
        categoryName: name,
        parentCategoryId
      });
    }

    return {
      output: {
        status: data?.status || 'ok',
        response: data
      },
      message: `Successfully ${action === 'create' ? 'created' : 'updated'} ${level} category **${name}**.`
    };
  })
  .build();
