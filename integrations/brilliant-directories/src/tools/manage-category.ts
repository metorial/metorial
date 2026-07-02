import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCategory = SlateTool.create(spec, {
  name: 'Get Post Type',
  key: 'get_post_type',
  description: `Retrieve a post type (data category) configuration by its ID.
Post types define the content categories available in the directory.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z.string().describe('The data category ID to retrieve.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      category: z.any().describe('The post type configuration data.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.getCategory(ctx.input.categoryId);

    return {
      output: {
        status: result.status,
        category: result.message
      },
      message: `Retrieved post type **${ctx.input.categoryId}**.`
    };
  })
  .build();

export let createCategory = SlateTool.create(spec, {
  name: 'Create Post Type',
  key: 'create_post_type',
  description: `Create a new post type (data category) configuration in the directory.`
})
  .input(
    z.object({
      categoryName: z.string().optional().describe('Name of the post type.'),
      categoryStatus: z.string().optional().describe('Status of the post type.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional configuration fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      category: z.any().describe('The newly created post type record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {};
    if (ctx.input.categoryName) data.category_name = ctx.input.categoryName;
    if (ctx.input.categoryStatus) data.category_status = ctx.input.categoryStatus;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createCategory(data);

    return {
      output: {
        status: result.status,
        category: result.message
      },
      message: `Created post type${ctx.input.categoryName ? ` **"${ctx.input.categoryName}"**` : ''}.`
    };
  })
  .build();

export let updateCategory = SlateTool.create(spec, {
  name: 'Update Post Type',
  key: 'update_post_type',
  description: `Update an existing post type (data category) configuration.`
})
  .input(
    z.object({
      categoryId: z.string().describe('The data category ID to update.'),
      categoryName: z.string().optional().describe('Updated name.'),
      categoryStatus: z.string().optional().describe('Updated status.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional configuration fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      category: z.any().describe('The updated post type record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {
      data_id: ctx.input.categoryId
    };

    if (ctx.input.categoryName) data.category_name = ctx.input.categoryName;
    if (ctx.input.categoryStatus) data.category_status = ctx.input.categoryStatus;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.updateCategory(data);

    return {
      output: {
        status: result.status,
        category: result.message
      },
      message: `Updated post type **${ctx.input.categoryId}**.`
    };
  })
  .build();

export let deleteCategory = SlateTool.create(spec, {
  name: 'Delete Post Type',
  key: 'delete_post_type',
  description: `Permanently delete a post type (data category) from the directory.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      categoryId: z.string().describe('The data category ID to delete.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      confirmation: z.string().describe('Confirmation message from the API.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.deleteCategory(ctx.input.categoryId);

    return {
      output: {
        status: result.status,
        confirmation:
          typeof result.message === 'string' ? result.message : JSON.stringify(result.message)
      },
      message: `Deleted post type **${ctx.input.categoryId}**.`
    };
  })
  .build();

export let searchCategories = SlateTool.create(spec, {
  name: 'Search Post Types',
  key: 'search_post_types',
  description: `Search for post types (data categories) in the directory.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search query.'),
      additionalFilters: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional search filters as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      categories: z.any().describe('The search results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let params: Record<string, any> = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.additionalFilters) {
      for (let [key, value] of Object.entries(ctx.input.additionalFilters)) {
        params[key] = value;
      }
    }

    let result = await client.searchCategories(params);

    return {
      output: {
        status: result.status,
        categories: result.message
      },
      message: `Found post types matching the search criteria.`
    };
  })
  .build();
