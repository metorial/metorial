import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoSquaredClient } from '../lib/client';
import { spec } from '../spec';

export let listSmartGroups = SlateTool.create(spec, {
  name: 'List Smart Groups',
  key: 'list_smart_groups',
  description: `Retrieve all Smart Groups configured in GoSquared People CRM. Returns group names and their applied filters.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      smartGroups: z
        .array(z.record(z.string(), z.any()))
        .describe('List of Smart Groups with their filters')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.getSmartGroups();
    let smartGroups = result?.list || result?.smartgroups || result || [];
    if (!Array.isArray(smartGroups)) smartGroups = [];

    return {
      output: { smartGroups },
      message: `Retrieved **${smartGroups.length}** Smart Groups.`
    };
  })
  .build();

export let getSmartGroupMembers = SlateTool.create(spec, {
  name: 'Get Smart Group Members',
  key: 'get_smart_group_members',
  description: `Retrieve the people belonging to a specific Smart Group in GoSquared People CRM. Supports search, field selection, sorting, and pagination.`,
  constraints: ['Maximum 250 results per request.'],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      groupId: z
        .string()
        .describe('Smart Group ID (typically the lowercase name of the group)'),
      query: z.string().optional().describe('Search term to filter members'),
      fields: z.string().optional().describe('Comma-delimited list of properties to return'),
      sort: z
        .string()
        .optional()
        .describe('Sort field with direction (e.g. "last.seen:desc")'),
      limit: z
        .string()
        .optional()
        .describe('Pagination in format "offset,count" (e.g. "0,10")')
    })
  )
  .output(
    z.object({
      people: z
        .array(z.record(z.string(), z.any()))
        .describe('List of people in the Smart Group'),
      total: z.number().optional().describe('Total count of people in the Smart Group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.getSmartGroupPeople(ctx.input.groupId, {
      query: ctx.input.query,
      fields: ctx.input.fields,
      sort: ctx.input.sort,
      limit: ctx.input.limit
    });

    let people = result?.people || [];
    let total = result?.total;

    return {
      output: { people, total },
      message: `Retrieved **${people.length}** members from Smart Group **${ctx.input.groupId}**.`
    };
  })
  .build();

export let createSmartGroup = SlateTool.create(spec, {
  name: 'Create Smart Group',
  key: 'create_smart_group',
  description: `Create a new Smart Group in GoSquared People CRM. A Smart Group is a saved filter/segment of users based on properties or events.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the Smart Group'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .describe('Array of filter objects defining the group criteria')
    })
  )
  .output(
    z.object({
      smartGroup: z.record(z.string(), z.any()).describe('The created Smart Group')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoSquaredClient({
      token: ctx.auth.token,
      siteToken: ctx.config.siteToken
    });

    let result = await client.createSmartGroup(ctx.input.name, ctx.input.filters);

    return {
      output: { smartGroup: result },
      message: `Created Smart Group **${ctx.input.name}**.`
    };
  })
  .build();
