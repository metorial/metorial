import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCategories = SlateTool.create(spec, {
  name: 'List Categories',
  key: 'list_categories',
  description: `Retrieve all exhibitor categories for a given event. Categories are used to organize exhibitors on the floor plan (e.g., "Gold Sponsors", "Food & Beverage").`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event')
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.number().describe('Category ID'),
            name: z.string().describe('Category name')
          })
        )
        .describe('List of categories')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let categories = await client.listCategories(ctx.input.eventId);

    return {
      output: {
        categories: categories.map(c => ({
          categoryId: c.id,
          name: c.name
        }))
      },
      message: `Found **${categories.length}** category(ies) for event ${ctx.input.eventId}.`
    };
  })
  .build();

export let addCategory = SlateTool.create(spec, {
  name: 'Add Category',
  key: 'add_category',
  description: `Create a new exhibitor category for an event. Categories help organize exhibitors on the floor plan.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      eventId: z.number().describe('ID of the event'),
      name: z.string().describe('Name for the new category')
    })
  )
  .output(
    z.object({
      categoryId: z.number().describe('ID of the newly created category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.addCategory(ctx.input.eventId, ctx.input.name);

    return {
      output: {
        categoryId: result.id
      },
      message: `Created category **${ctx.input.name}** with ID **${result.id}**.`
    };
  })
  .build();

export let updateCategory = SlateTool.create(spec, {
  name: 'Update Category',
  key: 'update_category',
  description: `Rename an existing exhibitor category.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      categoryId: z.number().describe('ID of the category to update'),
      name: z.string().describe('New name for the category')
    })
  )
  .output(
    z.object({
      categoryId: z.number().describe('ID of the updated category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.updateCategory(ctx.input.categoryId, ctx.input.name);

    return {
      output: {
        categoryId: ctx.input.categoryId
      },
      message: `Updated category **${ctx.input.categoryId}** to **${ctx.input.name}**.`
    };
  })
  .build();

export let removeCategory = SlateTool.create(spec, {
  name: 'Remove Category',
  key: 'remove_category',
  description: `Delete an exhibitor category from an event.`,
  constraints: [
    'Removing a category will unassign it from all exhibitors that were in that category.'
  ],
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      categoryId: z.number().describe('ID of the category to remove')
    })
  )
  .output(
    z.object({
      categoryId: z.number().describe('ID of the removed category')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.removeCategory(ctx.input.categoryId);

    return {
      output: {
        categoryId: ctx.input.categoryId
      },
      message: `Removed category **${ctx.input.categoryId}**.`
    };
  })
  .build();
