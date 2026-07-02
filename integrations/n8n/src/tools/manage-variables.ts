import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageVariables = SlateTool.create(spec, {
  name: 'Manage Variables',
  key: 'manage_variables',
  description: `Create, update, delete, or list variables stored in your n8n instance. Variables provide fixed data accessible across all workflows. Requires Pro or Enterprise plan.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete'])
        .describe('The variable operation to perform'),
      variableId: z
        .string()
        .optional()
        .describe('Variable ID (required for update and delete)'),
      key: z
        .string()
        .optional()
        .describe('Variable key/name (required for create and update)'),
      value: z.string().optional().describe('Variable value (required for create and update)'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID to scope the variable to (for create and list)'),
      limit: z.number().optional().describe('Max results for list action'),
      cursor: z.string().optional().describe('Pagination cursor for list action')
    })
  )
  .output(
    z.object({
      variables: z
        .array(
          z.object({
            variableId: z.string().describe('Variable ID'),
            key: z.string().describe('Variable key'),
            value: z.string().describe('Variable value')
          })
        )
        .optional()
        .describe('List of variables (for list action)'),
      variable: z
        .object({
          variableId: z.string().describe('Variable ID'),
          key: z.string().describe('Variable key'),
          value: z.string().describe('Variable value')
        })
        .optional()
        .describe('Single variable result (for create, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether deletion was successful (for delete action)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let mapVar = (v: any) => ({
      variableId: String(v.id),
      key: v.key || '',
      value: v.value || ''
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listVariables({
          limit: ctx.input.limit,
          cursor: ctx.input.cursor,
          projectId: ctx.input.projectId
        });
        let variables = (result.data || []).map(mapVar);
        return {
          output: { variables, nextCursor: result.nextCursor },
          message: `Found **${variables.length}** variable(s).`
        };
      }
      case 'create': {
        if (!ctx.input.key) throw new Error('Key is required for creating a variable');
        if (!ctx.input.value) throw new Error('Value is required for creating a variable');
        let variable = await client.createVariable({
          key: ctx.input.key,
          value: ctx.input.value,
          projectId: ctx.input.projectId
        });
        return {
          output: { variable: mapVar(variable) },
          message: `Created variable **"${ctx.input.key}"**.`
        };
      }
      case 'update': {
        if (!ctx.input.variableId)
          throw new Error('variableId is required for updating a variable');
        if (!ctx.input.key) throw new Error('Key is required for updating a variable');
        if (!ctx.input.value) throw new Error('Value is required for updating a variable');
        let variable = await client.updateVariable(ctx.input.variableId, {
          key: ctx.input.key,
          value: ctx.input.value
        });
        return {
          output: { variable: mapVar(variable) },
          message: `Updated variable **${ctx.input.variableId}** to key **"${ctx.input.key}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.variableId)
          throw new Error('variableId is required for deleting a variable');
        await client.deleteVariable(ctx.input.variableId);
        return {
          output: { deleted: true },
          message: `Deleted variable **${ctx.input.variableId}**.`
        };
      }
    }
  })
  .build();
