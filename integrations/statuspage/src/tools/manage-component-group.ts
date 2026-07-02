import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageComponentGroup = SlateTool.create(spec, {
  name: 'Manage Component Group',
  key: 'manage_component_group',
  description: `Create, update, or delete component groups on the status page. Component groups organize related components together.
- To **create**: omit \`groupId\` and provide \`name\` and optionally \`componentIds\`.
- To **update**: provide \`groupId\` and the fields to change.
- To **delete**: provide \`groupId\` and set \`delete\` to true.
- To **list**: omit all fields to list all component groups.`
})
  .input(
    z.object({
      groupId: z
        .string()
        .optional()
        .describe('ID of an existing component group to update or delete'),
      name: z.string().optional().describe('Name of the component group'),
      description: z.string().optional().describe('Description of the component group'),
      componentIds: z
        .array(z.string())
        .optional()
        .describe('IDs of components to include in this group'),
      delete: z.boolean().optional().describe('Set to true to delete the component group')
    })
  )
  .output(
    z.object({
      groups: z
        .array(
          z.object({
            groupId: z.string().describe('Unique identifier of the group'),
            name: z.string().optional().describe('Name of the group'),
            description: z.string().optional().nullable().describe('Description of the group'),
            componentIds: z
              .array(z.string())
              .optional()
              .describe('Component IDs in this group'),
            position: z.number().optional().describe('Display position'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .optional()
        .describe('List of component groups (when listing)'),
      group: z
        .object({
          groupId: z.string().describe('Unique identifier of the group'),
          name: z.string().optional().describe('Name of the group'),
          description: z.string().optional().nullable().describe('Description of the group'),
          componentIds: z.array(z.string()).optional().describe('Component IDs in this group'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
        .optional()
        .describe('The created or updated group'),
      deleted: z.boolean().optional().describe('Whether the group was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, pageId: ctx.config.pageId });

    if (ctx.input.delete && ctx.input.groupId) {
      await client.deleteComponentGroup(ctx.input.groupId);
      return {
        output: { deleted: true },
        message: `Deleted component group \`${ctx.input.groupId}\`.`
      };
    }

    if (!ctx.input.groupId && !ctx.input.name) {
      let raw = await client.listComponentGroups();
      let groups = raw.map((g: any) => ({
        groupId: g.id,
        name: g.name,
        description: g.description,
        componentIds: g.components?.map((c: any) => c.id || c) || g.component_ids,
        position: g.position,
        createdAt: g.created_at,
        updatedAt: g.updated_at
      }));
      return {
        output: { groups },
        message: `Found **${groups.length}** component group(s).`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.description !== undefined) data.description = ctx.input.description;
    if (ctx.input.componentIds !== undefined) data.component_ids = ctx.input.componentIds;

    let result: any;
    if (ctx.input.groupId) {
      result = await client.updateComponentGroup(ctx.input.groupId, data);
    } else {
      result = await client.createComponentGroup(data);
    }

    let group = {
      groupId: result.id,
      name: result.name,
      description: result.description,
      componentIds: result.components?.map((c: any) => c.id || c) || result.component_ids,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    let action = ctx.input.groupId ? 'Updated' : 'Created';
    return {
      output: { group },
      message: `${action} component group **${result.name}**.`
    };
  })
  .build();
