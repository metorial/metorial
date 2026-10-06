import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/connection';
import { spec } from '../spec';

export let manageVariables = SlateTool.create(spec, {
  name: 'Manage Variables',
  key: 'manage_variables',
  description: `Create, update, delete, or list variables stored in your n8n instance. Variables provide fixed data accessible across all workflows. Requires Pro or Enterprise plan.`,
  tags: {
    destructive: true
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
      state: z.enum(['empty']).optional().describe('Native empty-value filter for list'),
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
      accepted: z
        .boolean()
        .optional()
        .describe(
          'Native request acceptance; list variables separately to observe the resulting state'
        ),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether deletion was successful (for delete action)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);

    let mapVar = (v: Awaited<ReturnType<typeof client.listVariables>>['data'][number]) => ({
      variableId: String(v.id),
      key: v.key || '',
      value: v.value
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listVariables({
          limit: ctx.input.limit,
          cursor: ctx.input.cursor,
          projectId: ctx.input.projectId,
          state: ctx.input.state
        });
        let variables = (result.data || []).map(mapVar);
        return {
          output: { variables, nextCursor: result.nextCursor },
          message: `Found **${variables.length}** variable(s).`
        };
      }
      case 'create': {
        if (!ctx.input.key) throw invalid('Key is required for creating a variable');
        if (ctx.input.value === undefined)
          throw invalid('Value is required for creating a variable');
        await client.createVariable({
          key: ctx.input.key,
          value: ctx.input.value,
          projectId: ctx.input.projectId
        });
        return {
          output: { accepted: true },
          message: `Created variable **"${ctx.input.key}"**.`
        };
      }
      case 'update': {
        if (!ctx.input.variableId)
          throw invalid('variableId is required for updating a variable');
        if (!ctx.input.key) throw invalid('Key is required for updating a variable');
        if (ctx.input.value === undefined)
          throw invalid('Value is required for updating a variable');
        await client.updateVariable(ctx.input.variableId, {
          key: ctx.input.key,
          value: ctx.input.value
        });
        return {
          output: { accepted: true },
          message: `Updated variable **${ctx.input.variableId}** to key **"${ctx.input.key}"**.`
        };
      }
      case 'delete': {
        if (!ctx.input.variableId)
          throw invalid('variableId is required for deleting a variable');
        await client.deleteVariable(ctx.input.variableId);
        return {
          output: { deleted: true },
          message: `Deleted variable **${ctx.input.variableId}**.`
        };
      }
    }
  })
  .build();
