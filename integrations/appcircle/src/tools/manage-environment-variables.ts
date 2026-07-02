import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageEnvironmentVariables = SlateTool.create(spec, {
  name: 'Manage Environment Variables',
  key: 'manage_environment_variables',
  description: `Manage environment variable groups and their variables. Supports creating and deleting variable groups, as well as adding, updating, and removing individual variables within a group. Use **action** to specify the operation.`,
  instructions: [
    'Use action "list_groups" to list all variable groups.',
    'Use action "create_group" to create a new group (provide groupName and optionally variables).',
    'Use action "delete_group" to delete a group (provide variableGroupId).',
    'Use action "list_variables" to list variables in a group (provide variableGroupId).',
    'Use action "add_variable" to add a variable (provide variableGroupId, key, value, and optionally isSecret).',
    'Use action "update_variable" to update a non-secret variable (provide variableGroupId, key, value).',
    'Use action "delete_variables" to remove variables by key (provide variableGroupId and keys).'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_groups',
          'create_group',
          'delete_group',
          'rename_group',
          'list_variables',
          'add_variable',
          'update_variable',
          'delete_variables'
        ])
        .describe('The operation to perform'),
      variableGroupId: z
        .string()
        .optional()
        .describe('ID of the variable group (required for group-specific operations)'),
      groupName: z
        .string()
        .optional()
        .describe('Name for the variable group (used in create_group and rename_group)'),
      variables: z
        .array(
          z.object({
            key: z.string(),
            value: z.string(),
            isSecret: z.boolean().optional()
          })
        )
        .optional()
        .describe('Variables to add when creating a group'),
      key: z.string().optional().describe('Variable key (for add_variable, update_variable)'),
      value: z
        .string()
        .optional()
        .describe('Variable value (for add_variable, update_variable)'),
      isSecret: z
        .boolean()
        .optional()
        .describe('Whether the variable is secret (for add_variable)'),
      keys: z
        .array(z.string())
        .optional()
        .describe('Variable keys to delete (for delete_variables)')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action } = ctx.input;

    switch (action) {
      case 'list_groups': {
        let groups = await client.listVariableGroups();
        let items = Array.isArray(groups) ? groups : [];
        return { output: items, message: `Found **${items.length}** variable group(s).` };
      }
      case 'create_group': {
        if (!ctx.input.groupName) throw new Error('groupName is required for create_group');
        let group = await client.createVariableGroup({
          name: ctx.input.groupName,
          variables: ctx.input.variables
        });
        return {
          output: group,
          message: `Created variable group **${ctx.input.groupName}**.`
        };
      }
      case 'delete_group': {
        if (!ctx.input.variableGroupId)
          throw new Error('variableGroupId is required for delete_group');
        await client.deleteVariableGroup(ctx.input.variableGroupId);
        return {
          output: { success: true },
          message: `Deleted variable group **${ctx.input.variableGroupId}**.`
        };
      }
      case 'rename_group': {
        if (!ctx.input.variableGroupId || !ctx.input.groupName)
          throw new Error('variableGroupId and groupName are required for rename_group');
        let renamed = await client.renameVariableGroup(
          ctx.input.variableGroupId,
          ctx.input.groupName
        );
        return {
          output: renamed,
          message: `Renamed variable group to **${ctx.input.groupName}**.`
        };
      }
      case 'list_variables': {
        if (!ctx.input.variableGroupId)
          throw new Error('variableGroupId is required for list_variables');
        let vars = await client.listVariables(ctx.input.variableGroupId);
        let items = Array.isArray(vars) ? vars : [];
        return { output: items, message: `Found **${items.length}** variable(s) in group.` };
      }
      case 'add_variable': {
        if (!ctx.input.variableGroupId || !ctx.input.key || !ctx.input.value)
          throw new Error('variableGroupId, key, and value are required for add_variable');
        let added = await client.addVariable(ctx.input.variableGroupId, {
          key: ctx.input.key,
          value: ctx.input.value,
          isSecret: ctx.input.isSecret
        });
        return { output: added, message: `Added variable **${ctx.input.key}** to group.` };
      }
      case 'update_variable': {
        if (!ctx.input.variableGroupId || !ctx.input.key || !ctx.input.value)
          throw new Error('variableGroupId, key, and value are required for update_variable');
        let updated = await client.updateVariable(ctx.input.variableGroupId, {
          key: ctx.input.key,
          value: ctx.input.value
        });
        return { output: updated, message: `Updated variable **${ctx.input.key}** in group.` };
      }
      case 'delete_variables': {
        if (!ctx.input.variableGroupId || !ctx.input.keys?.length)
          throw new Error('variableGroupId and keys are required for delete_variables');
        await client.deleteVariables(ctx.input.variableGroupId, ctx.input.keys);
        return {
          output: { success: true },
          message: `Deleted **${ctx.input.keys.length}** variable(s) from group.`
        };
      }
    }
  })
  .build();
