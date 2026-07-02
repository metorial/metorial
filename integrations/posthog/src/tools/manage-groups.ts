import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let groupOutput = z.object({
  groupTypeIndex: z.number().describe('PostHog group type index'),
  groupKey: z.string().describe('Group key'),
  groupProperties: z
    .record(z.string(), z.any())
    .nullable()
    .optional()
    .describe('Group properties'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let groupTypeOutput = z.object({
  groupType: z.string().optional().describe('Group type key'),
  groupTypeIndex: z.number().describe('PostHog group type index'),
  nameSingular: z.string().optional().describe('Singular display name'),
  namePlural: z.string().optional().describe('Plural display name'),
  detailDashboard: z.number().nullable().optional().describe('Detail dashboard ID'),
  defaultColumns: z.array(z.string()).optional().describe('Default columns'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

let mapGroup = (group: any) => ({
  groupTypeIndex: Number(group.group_type_index),
  groupKey: String(group.group_key),
  groupProperties: group.group_properties ?? null,
  createdAt: group.created_at
});

let mapGroupType = (groupType: any) => ({
  groupType: groupType.group_type,
  groupTypeIndex: Number(groupType.group_type_index),
  nameSingular: groupType.name_singular,
  namePlural: groupType.name_plural,
  detailDashboard:
    groupType.detail_dashboard === undefined ? undefined : groupType.detail_dashboard,
  defaultColumns: groupType.default_columns,
  createdAt: groupType.created_at
});

export let listGroupTypesTool = SlateTool.create(spec, {
  name: 'List Group Types',
  key: 'list_group_types',
  description: `List configured PostHog group types. Use the returned groupTypeIndex with group list/find/update tools.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      groupTypes: z.array(groupTypeOutput)
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listGroupTypes();
    let rawGroupTypes = Array.isArray(data) ? data : data.results || [];
    let groupTypes = rawGroupTypes.map(mapGroupType);

    return {
      output: { groupTypes },
      message: `Found **${groupTypes.length}** group type(s).`
    };
  })
  .build();

export let listGroupsTool = SlateTool.create(spec, {
  name: 'List Groups',
  key: 'list_groups',
  description: `List groups for a specific PostHog group type. Uses PostHog's forward-only cursor pagination.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      groupTypeIndex: z.number().describe('Group type index from List Group Types'),
      groupKey: z.string().optional().describe('Filter by exact group key'),
      search: z.string().optional().describe('Search group keys'),
      cursor: z.string().optional().describe('Forward pagination cursor')
    })
  )
  .output(
    z.object({
      groups: z.array(groupOutput),
      nextCursor: z.string().nullable().optional().describe('Next cursor, if returned'),
      hasMore: z.boolean().describe('Whether there are more groups')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listGroups({
      groupTypeIndex: ctx.input.groupTypeIndex,
      groupKey: ctx.input.groupKey,
      search: ctx.input.search,
      cursor: ctx.input.cursor
    });
    let rawGroups = Array.isArray(data) ? data : data.results || [];
    let groups = rawGroups.map(mapGroup);

    return {
      output: {
        groups,
        nextCursor: data.next ?? null,
        hasMore: !!data.next
      },
      message: `Found **${groups.length}** group(s).`
    };
  })
  .build();

export let findGroupTool = SlateTool.create(spec, {
  name: 'Find Group',
  key: 'find_group',
  description: `Find a specific PostHog group by group type index and group key.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      groupTypeIndex: z.number().describe('Group type index from List Group Types'),
      groupKey: z.string().describe('Group key'),
      skipCreateNotebook: z
        .boolean()
        .optional()
        .describe('Pass through PostHog skip_create_notebook behavior')
    })
  )
  .output(groupOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let group = await client.findGroup({
      groupTypeIndex: ctx.input.groupTypeIndex,
      groupKey: ctx.input.groupKey,
      skipCreateNotebook: ctx.input.skipCreateNotebook
    });

    return {
      output: mapGroup(group),
      message: `Found group **${ctx.input.groupKey}**.`
    };
  })
  .build();

export let createGroupTool = SlateTool.create(spec, {
  name: 'Create Group',
  key: 'create_group',
  description: `Create or update a PostHog group for a configured group type.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      groupTypeIndex: z.number().describe('Group type index from List Group Types'),
      groupKey: z.string().describe('Group key'),
      groupProperties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Properties to set on the group')
    })
  )
  .output(groupOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let group = await client.createGroup({
      group_type_index: ctx.input.groupTypeIndex,
      group_key: ctx.input.groupKey,
      group_properties: ctx.input.groupProperties
    });

    return {
      output: mapGroup(group),
      message: `Created group **${ctx.input.groupKey}**.`
    };
  })
  .build();

export let updateGroupPropertyTool = SlateTool.create(spec, {
  name: 'Update Group Property',
  key: 'update_group_property',
  description: `Set or update properties for a PostHog group.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      groupTypeIndex: z.number().describe('Group type index from List Group Types'),
      groupKey: z.string().describe('Group key'),
      groupProperties: z.record(z.string(), z.any()).describe('Properties to set')
    })
  )
  .output(
    z.object({
      updated: z.boolean().describe('Whether the group property update was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.updateGroupProperty({
      group_type_index: ctx.input.groupTypeIndex,
      group_key: ctx.input.groupKey,
      group_properties: ctx.input.groupProperties
    });

    return {
      output: { updated: true },
      message: `Updated group **${ctx.input.groupKey}**.`
    };
  })
  .build();

export let deleteGroupPropertyTool = SlateTool.create(spec, {
  name: 'Delete Group Property',
  key: 'delete_group_property',
  description: `Delete one or more properties from a PostHog group.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      groupTypeIndex: z.number().describe('Group type index from List Group Types'),
      groupKey: z.string().describe('Group key'),
      groupProperties: z
        .array(z.string())
        .optional()
        .describe(
          'Property names to delete. If omitted, PostHog receives only the group identity.'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the group property deletion was accepted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteGroupProperty({
      group_type_index: ctx.input.groupTypeIndex,
      group_key: ctx.input.groupKey,
      group_properties: ctx.input.groupProperties
    });

    return {
      output: { deleted: true },
      message: `Deleted group properties for **${ctx.input.groupKey}**.`
    };
  })
  .build();
