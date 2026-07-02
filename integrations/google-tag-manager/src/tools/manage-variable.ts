import { SlateTool } from 'slates';
import { z } from 'zod';
import { GtmClient } from '../lib/client';
import { googleTagManagerActionScopes } from '../scopes';
import { spec } from '../spec';

let parameterSchema = z.object({
  type: z.string().optional().describe('Parameter type'),
  key: z.string().optional().describe('Parameter key'),
  value: z.string().optional().describe('Parameter value'),
  list: z.array(z.any()).optional().describe('List parameter values'),
  map: z.array(z.any()).optional().describe('Map parameter values')
});

let variableOutputSchema = z.object({
  variableId: z.string().optional().describe('Variable ID'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  workspaceId: z.string().optional().describe('Parent workspace ID'),
  name: z.string().optional().describe('Variable name'),
  type: z.string().optional().describe('Variable type'),
  notes: z.string().optional().describe('Variable notes'),
  parameter: z.array(parameterSchema).optional().describe('Variable parameters'),
  fingerprint: z.string().optional().describe('Variable fingerprint'),
  tagManagerUrl: z.string().optional().describe('URL to the GTM UI'),
  parentFolderId: z.string().optional().describe('Parent folder ID')
});

let builtInVariableSchema = z.object({
  type: z.string().optional().describe('Built-in variable type'),
  name: z.string().optional().describe('Built-in variable name'),
  accountId: z.string().optional().describe('Parent account ID'),
  containerId: z.string().optional().describe('Parent container ID'),
  workspaceId: z.string().optional().describe('Parent workspace ID')
});

export let manageVariable = SlateTool.create(spec, {
  name: 'Manage Variable',
  key: 'manage_variable',
  description: `Create, list, get, update, or delete user-defined variables in a GTM workspace. Also supports listing, enabling, and disabling built-in variables.`,
  instructions: [
    'Common variable types: "v" (Data Layer Variable), "jsm" (Custom JavaScript), "j" (JavaScript Variable), "k" (First-party Cookie), "c" (Constant), "r" (Random Number), "u" (URL), "d" (DOM Element), "aev" (Auto-Event Variable), "smm" (Lookup Table), "remm" (RegEx Table).',
    'Set variableCategory to "builtIn" to work with built-in variables instead.',
    'Built-in variable types include: "pageUrl", "pageHostname", "pagePath", "referrer", "event", "clickElement", "clickClasses", "clickId", "clickTarget", "clickUrl", "clickText", "formElement", "formClasses", "formId", "formTarget", "formUrl", "formText", "errorMessage", "errorUrl", "errorLine", "newHistoryFragment", "oldHistoryFragment", "newHistoryState", "oldHistoryState", "historySource", etc.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleTagManagerActionScopes.manageVariable)
  .input(
    z.object({
      action: z
        .enum(['create', 'list', 'get', 'update', 'delete'])
        .describe('Operation to perform'),
      variableCategory: z
        .enum(['custom', 'builtIn'])
        .optional()
        .describe('Category of variable (default: "custom")'),
      accountId: z.string().describe('GTM account ID'),
      containerId: z.string().describe('GTM container ID'),
      workspaceId: z.string().describe('GTM workspace ID'),
      variableId: z
        .string()
        .optional()
        .describe('Variable ID (required for get, update, delete on custom variables)'),
      name: z.string().optional().describe('Variable name (required for create)'),
      type: z
        .string()
        .optional()
        .describe('Variable type (required for create custom variables)'),
      parameter: z
        .array(parameterSchema)
        .optional()
        .describe('Variable configuration parameters'),
      notes: z.string().optional().describe('Variable notes'),
      parentFolderId: z.string().optional().describe('Folder ID to organize this variable in'),
      builtInTypes: z
        .array(z.string())
        .optional()
        .describe(
          'For built-in variables: types to enable or disable (used with create/delete actions on builtIn category)'
        )
    })
  )
  .output(
    z.object({
      variable: variableOutputSchema
        .optional()
        .describe('Variable details (for single custom variable operations)'),
      variables: z
        .array(variableOutputSchema)
        .optional()
        .describe('List of custom variables (for list action)'),
      builtInVariables: z
        .array(builtInVariableSchema)
        .optional()
        .describe('List of built-in variables')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GtmClient(ctx.auth.token);
    let { action, accountId, containerId, workspaceId, variableId } = ctx.input;
    let category = ctx.input.variableCategory || 'custom';

    // Built-in variable operations
    if (category === 'builtIn') {
      if (action === 'list') {
        let response = await client.listBuiltInVariables(accountId, containerId, workspaceId);
        let builtInVariables = response.builtInVariable || [];
        return {
          output: { builtInVariables } as any,
          message: `Found **${builtInVariables.length}** enabled built-in variable(s)`
        };
      }

      if (action === 'create') {
        if (!ctx.input.builtInTypes || ctx.input.builtInTypes.length === 0) {
          throw new Error('builtInTypes is required to enable built-in variables');
        }
        let enabled = await client.enableBuiltInVariables(
          accountId,
          containerId,
          workspaceId,
          ctx.input.builtInTypes
        );
        return {
          output: { builtInVariables: enabled } as any,
          message: `Enabled **${enabled.length}** built-in variable(s)`
        };
      }

      if (action === 'delete') {
        if (!ctx.input.builtInTypes || ctx.input.builtInTypes.length === 0) {
          throw new Error('builtInTypes is required to disable built-in variables');
        }
        await client.disableBuiltInVariables(
          accountId,
          containerId,
          workspaceId,
          ctx.input.builtInTypes
        );
        return {
          output: { builtInVariables: [] } as any,
          message: `Disabled **${ctx.input.builtInTypes.length}** built-in variable type(s)`
        };
      }

      throw new Error(
        `Action "${action}" is not supported for built-in variables. Use "list", "create" (enable), or "delete" (disable).`
      );
    }

    // Custom variable operations
    if (action === 'list') {
      let response = await client.listVariables(accountId, containerId, workspaceId);
      let variables = response.variable || [];
      return {
        output: { variables } as any,
        message: `Found **${variables.length}** variable(s) in workspace \`${workspaceId}\``
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a variable');
      if (!ctx.input.type) throw new Error('Type is required for creating a variable');

      let varData: Record<string, unknown> = {
        name: ctx.input.name,
        type: ctx.input.type
      };
      if (ctx.input.parameter) varData.parameter = ctx.input.parameter;
      if (ctx.input.notes) varData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId) varData.parentFolderId = ctx.input.parentFolderId;

      let variable = await client.createVariable(accountId, containerId, workspaceId, varData);
      return {
        output: { variable } as any,
        message: `Created variable **"${variable.name}"** (ID: \`${variable.variableId}\`, type: \`${variable.type}\`)`
      };
    }

    if (!variableId)
      throw new Error('variableId is required for get, update, and delete actions');

    if (action === 'get') {
      let variable = await client.getVariable(accountId, containerId, workspaceId, variableId);
      return {
        output: { variable } as any,
        message: `Retrieved variable **"${variable.name}"** (type: \`${variable.type}\`)`
      };
    }

    if (action === 'update') {
      let updateData: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
      if (ctx.input.parameter !== undefined) updateData.parameter = ctx.input.parameter;
      if (ctx.input.notes !== undefined) updateData.notes = ctx.input.notes;
      if (ctx.input.parentFolderId !== undefined)
        updateData.parentFolderId = ctx.input.parentFolderId;

      let variable = await client.updateVariable(
        accountId,
        containerId,
        workspaceId,
        variableId,
        updateData
      );
      return {
        output: { variable } as any,
        message: `Updated variable **"${variable.name}"** (ID: \`${variable.variableId}\`)`
      };
    }

    // delete
    await client.deleteVariable(accountId, containerId, workspaceId, variableId);
    return {
      output: { variable: { variableId, accountId, containerId, workspaceId } } as any,
      message: `Deleted variable \`${variableId}\``
    };
  })
  .build();
