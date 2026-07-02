import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let filterSchema = z.object({
  filterId: z.string().describe('Filter ID'),
  name: z.string().describe('Filter name'),
  query: z.string().describe('Filter query expression'),
  color: z.string().describe('Filter color'),
  order: z.number().describe('Display order'),
  isFavorite: z.boolean().describe('Whether filter is favorited')
});

export let getFilters = SlateTool.create(spec, {
  name: 'Get Filters',
  key: 'get_filters',
  description: `List all saved filter views. Filters use Todoist's query language to define task views (e.g. "priority 1 & today").`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      filters: z.array(filterSchema).describe('Retrieved filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filters = await client.getFilters();

    return {
      output: { filters },
      message: `Retrieved **${filters.length}** filter(s).`
    };
  });

export let createFilter = SlateTool.create(spec, {
  name: 'Create Filter',
  key: 'create_filter',
  description: `Create a saved filter view using Todoist's query language. Examples: "priority 1 & today", "overdue | due: today", "#Work & @urgent".`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Filter name'),
      query: z.string().describe('Filter query expression'),
      color: z.string().optional().describe('Color name'),
      order: z.number().optional().describe('Display order'),
      isFavorite: z.boolean().optional().describe('Mark as favorite')
    })
  )
  .output(filterSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let filter = await client.createFilter(ctx.input);

    return {
      output: filter,
      message: `Created filter **"${filter.name}"** with query \`${filter.query}\`.`
    };
  });

export let updateFilter = SlateTool.create(spec, {
  name: 'Update Filter',
  key: 'update_filter',
  description: `Update a saved filter's name, query, color, or favorite status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      filterId: z.string().describe('Filter ID to update'),
      name: z.string().optional().describe('New filter name'),
      query: z.string().optional().describe('New filter query'),
      color: z.string().optional().describe('New color name'),
      order: z.number().optional().describe('New display order'),
      isFavorite: z.boolean().optional().describe('Favorite status')
    })
  )
  .output(filterSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { filterId, ...updateData } = ctx.input;
    let filter = await client.updateFilter(filterId, updateData);

    return {
      output: filter,
      message: `Updated filter **"${filter.name}"** (ID: ${filter.filterId}).`
    };
  });

export let deleteFilter = SlateTool.create(spec, {
  name: 'Delete Filter',
  key: 'delete_filter',
  description: `Delete a saved filter view.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      filterId: z.string().describe('Filter ID to delete')
    })
  )
  .output(
    z.object({
      filterId: z.string().describe('Deleted filter ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteFilter(ctx.input.filterId);

    return {
      output: { filterId: ctx.input.filterId },
      message: `Deleted filter (ID: ${ctx.input.filterId}).`
    };
  });
