import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractCategorySummary, extractTagSummary } from '../lib/helpers';
import { spec } from '../spec';

let categoryOutputSchema = z.object({
  categoryId: z.string().describe('Unique identifier of the category'),
  name: z.string().describe('Category name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().describe('Category description'),
  parentId: z.string().describe('Parent category ID (0 if top-level)'),
  postCount: z.number().describe('Number of posts in this category')
});

let tagOutputSchema = z.object({
  tagId: z.string().describe('Unique identifier of the tag'),
  name: z.string().describe('Tag name'),
  slug: z.string().describe('URL-friendly slug'),
  description: z.string().describe('Tag description'),
  postCount: z.number().describe('Number of posts with this tag')
});

export let listCategoriesTool = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all categories on the site. Categories are hierarchical and can be used to organize posts. Supports search filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search categories by name'),
      perPage: z.number().optional().describe('Number of categories to return (default: 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      categories: z.array(categoryOutputSchema),
      count: z.number().describe('Number of categories returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let categories = await client.listCategories(ctx.input);
    let results = categories.map((c: any) => extractCategorySummary(c, ctx.config.apiType));
    return {
      output: {
        categories: results,
        count: results.length
      },
      message: `Found **${results.length}** categor${results.length === 1 ? 'y' : 'ies'}.`
    };
  })
  .build();

export let createCategoryTool = SlateTool.create(spec, {
  name: 'Create Category',
  key: 'create_category',
  description: `Create a new post category. Categories are hierarchical — you can specify a parent category to create subcategories.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Category name'),
      description: z.string().optional().describe('Category description'),
      parentId: z
        .string()
        .optional()
        .describe('Parent category ID for creating a subcategory'),
      slug: z.string().optional().describe('Custom URL slug')
    })
  )
  .output(categoryOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let category = await client.createCategory(ctx.input);
    let result = extractCategorySummary(category, ctx.config.apiType);
    return {
      output: result,
      message: `Created category **"${result.name}"** (ID: ${result.categoryId}).`
    };
  })
  .build();

export let deleteCategoryTool = SlateTool.create(spec, {
  name: 'Delete Category',
  key: 'delete_category',
  description: `Delete a category. Posts in this category will not be deleted but will be reassigned to the default category.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      categoryId: z.string().describe('ID of the category to delete')
    })
  )
  .output(
    z.object({
      categoryId: z.string().describe('ID of the deleted category'),
      deleted: z.boolean().describe('Whether the category was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteCategory(ctx.input.categoryId);
    return {
      output: {
        categoryId: ctx.input.categoryId,
        deleted: true
      },
      message: `Deleted category **${ctx.input.categoryId}**.`
    };
  })
  .build();

export let listTagsTool = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: `Retrieve all tags on the site. Tags are flat (non-hierarchical) taxonomy terms used to describe posts. Supports search filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search tags by name'),
      perPage: z.number().optional().describe('Number of tags to return (default: 100)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      tags: z.array(tagOutputSchema),
      count: z.number().describe('Number of tags returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let tagsList = await client.listTags(ctx.input);
    let results = tagsList.map((t: any) => extractTagSummary(t, ctx.config.apiType));
    return {
      output: {
        tags: results,
        count: results.length
      },
      message: `Found **${results.length}** tag(s).`
    };
  })
  .build();

export let createTagTool = SlateTool.create(spec, {
  name: 'Create Tag',
  key: 'create_tag',
  description: `Create a new post tag for organizing and labeling content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Tag name'),
      description: z.string().optional().describe('Tag description'),
      slug: z.string().optional().describe('Custom URL slug')
    })
  )
  .output(tagOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let tag = await client.createTag(ctx.input);
    let result = extractTagSummary(tag, ctx.config.apiType);
    return {
      output: result,
      message: `Created tag **"${result.name}"** (ID: ${result.tagId}).`
    };
  })
  .build();

export let deleteTagTool = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a tag. Posts with this tag will not be deleted but will lose this tag assignment.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      tagId: z.string().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      tagId: z.string().describe('ID of the deleted tag'),
      deleted: z.boolean().describe('Whether the tag was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteTag(ctx.input.tagId);
    return {
      output: {
        tagId: ctx.input.tagId,
        deleted: true
      },
      message: `Deleted tag **${ctx.input.tagId}**.`
    };
  })
  .build();
