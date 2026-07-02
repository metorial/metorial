import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { jiraServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createFilterTool = SlateTool.create(spec, {
  name: 'Create Filter',
  key: 'create_filter',
  description: `Create a saved JQL filter in Jira. Filters can be used to quickly access frequently used search queries.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('The filter name.'),
      jql: z.string().describe('The JQL query for this filter.'),
      description: z.string().optional().describe('Optional description of the filter.'),
      favourite: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to mark the filter as a favourite.')
    })
  )
  .output(
    z.object({
      filterId: z.string().describe('The ID of the created filter.'),
      name: z.string().describe('The filter name.'),
      jql: z.string().describe('The JQL query.'),
      owner: z.string().optional().describe('Display name of the filter owner.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let filter = await client.createFilter({
      name: ctx.input.name,
      jql: ctx.input.jql,
      description: ctx.input.description,
      favourite: ctx.input.favourite
    });

    return {
      output: {
        filterId: filter.id,
        name: filter.name,
        jql: filter.jql,
        owner: filter.owner?.displayName
      },
      message: `Created filter **${filter.name}** (ID: ${filter.id}).`
    };
  })
  .build();

export let getFilterTool = SlateTool.create(spec, {
  name: 'Get Filter',
  key: 'get_filter',
  description: `Retrieve a saved Jira JQL filter by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filterId: z.string().describe('The filter ID to retrieve.')
    })
  )
  .output(
    z.object({
      filterId: z.string().describe('The filter ID.'),
      name: z.string().describe('The filter name.'),
      jql: z.string().describe('The JQL query.'),
      description: z.string().optional().describe('The filter description.'),
      owner: z.string().optional().describe('Display name of the filter owner.'),
      favourite: z.boolean().optional().describe('Whether the filter is a favourite.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let filter = await client.getFilter(ctx.input.filterId);

    return {
      output: {
        filterId: filter.id,
        name: filter.name,
        jql: filter.jql,
        description: filter.description,
        owner: filter.owner?.displayName,
        favourite: filter.favourite
      },
      message: `Retrieved filter **${filter.name}** (ID: ${filter.id}).`
    };
  })
  .build();

export let updateFilterTool = SlateTool.create(spec, {
  name: 'Update Filter',
  key: 'update_filter',
  description: `Update a saved Jira JQL filter's name, description, query, or favourite state.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      filterId: z.string().describe('The filter ID to update.'),
      name: z.string().optional().describe('Updated filter name.'),
      jql: z.string().optional().describe('Updated JQL query.'),
      description: z.string().optional().describe('Updated filter description.'),
      favourite: z.boolean().optional().describe('Whether to mark the filter as favourite.')
    })
  )
  .output(
    z.object({
      filterId: z.string().describe('The filter ID.'),
      name: z.string().describe('The filter name.'),
      jql: z.string().describe('The JQL query.'),
      description: z.string().optional().describe('The filter description.'),
      favourite: z.boolean().optional().describe('Whether the filter is a favourite.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let fields: Record<string, any> = {};
    if (ctx.input.name !== undefined) fields.name = ctx.input.name;
    if (ctx.input.jql !== undefined) fields.jql = ctx.input.jql;
    if (ctx.input.description !== undefined) fields.description = ctx.input.description;
    if (ctx.input.favourite !== undefined) fields.favourite = ctx.input.favourite;

    if (Object.keys(fields).length === 0) {
      throw jiraServiceError(
        'Provide name, jql, description, or favourite to update a filter.'
      );
    }

    let filter = await client.updateFilter(ctx.input.filterId, fields);

    return {
      output: {
        filterId: filter.id,
        name: filter.name,
        jql: filter.jql,
        description: filter.description,
        favourite: filter.favourite
      },
      message: `Updated filter **${filter.name}** (ID: ${filter.id}).`
    };
  })
  .build();

export let deleteFilterTool = SlateTool.create(spec, {
  name: 'Delete Filter',
  key: 'delete_filter',
  description: `Delete a saved Jira JQL filter owned by the authenticated user.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      filterId: z.string().describe('The filter ID to delete.')
    })
  )
  .output(
    z.object({
      filterId: z.string().describe('The deleted filter ID.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    await client.deleteFilter(ctx.input.filterId);

    return {
      output: {
        filterId: ctx.input.filterId
      },
      message: `Deleted filter **${ctx.input.filterId}**.`
    };
  })
  .build();

export let listFavouriteFiltersTool = SlateTool.create(spec, {
  name: 'List Favourite Filters',
  key: 'list_favourite_filters',
  description: `List the authenticated user's favourite saved JQL filters.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      filters: z.array(
        z.object({
          filterId: z.string().describe('The filter ID.'),
          name: z.string().describe('The filter name.'),
          jql: z.string().describe('The JQL query.'),
          owner: z.string().optional().describe('Display name of the filter owner.'),
          favourite: z.boolean().describe('Whether the filter is a favourite.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId,
      refreshToken: ctx.auth.refreshToken
    });

    let filters = await client.getFavouriteFilters();

    return {
      output: {
        filters: filters.map((f: any) => ({
          filterId: f.id,
          name: f.name,
          jql: f.jql,
          owner: f.owner?.displayName,
          favourite: f.favourite ?? true
        }))
      },
      message: `Found **${filters.length}** favourite filters.`
    };
  })
  .build();
