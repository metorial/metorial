import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { mapPagination } from '../lib/mappers';
import { spec } from '../spec';

let variableSetSchema = z.object({
  variableSetId: z.string(),
  name: z.string(),
  description: z.string(),
  global: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string()
});

let mapVariableSet = (data: any) => ({
  variableSetId: data.id || '',
  name: data.attributes?.name || '',
  description: data.attributes?.description || '',
  global: data.attributes?.global ?? false,
  createdAt: data.attributes?.['created-at'] || '',
  updatedAt: data.attributes?.['updated-at'] || ''
});

export let listVariableSetsTool = SlateTool.create(spec, {
  name: 'List Variable Sets',
  key: 'list_variable_sets',
  description: `List all variable sets in the organization. Variable sets allow sharing common variables across multiple workspaces without duplicating them.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      variableSets: z.array(variableSetSchema),
      pagination: z.object({
        currentPage: z.number(),
        totalPages: z.number(),
        totalCount: z.number(),
        pageSize: z.number()
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.listVariableSets({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let variableSets = (response.data || []).map(mapVariableSet);
    let pagination = mapPagination(response.meta);

    return {
      output: { variableSets, pagination },
      message: `Found **${pagination.totalCount}** variable set(s).`
    };
  })
  .build();

export let createVariableSetTool = SlateTool.create(spec, {
  name: 'Create Variable Set',
  key: 'create_variable_set',
  description: `Create a reusable variable set. Apply it globally to all workspaces or scope it to specific workspaces and projects.`
})
  .input(
    z.object({
      name: z.string().describe('Name for the variable set'),
      description: z.string().optional().describe('Description of the variable set'),
      global: z
        .boolean()
        .optional()
        .describe('Whether to apply to all workspaces in the organization (default: false)'),
      workspaceIds: z
        .array(z.string())
        .optional()
        .describe('Workspace IDs to apply this variable set to'),
      projectIds: z
        .array(z.string())
        .optional()
        .describe('Project IDs to apply this variable set to')
    })
  )
  .output(variableSetSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let response = await client.createVariableSet(ctx.input);
    let variableSet = mapVariableSet(response.data);

    return {
      output: variableSet,
      message: `Created variable set **${variableSet.name}** (${variableSet.variableSetId}), global: ${variableSet.global}.`
    };
  })
  .build();

export let deleteVariableSetTool = SlateTool.create(spec, {
  name: 'Delete Variable Set',
  key: 'delete_variable_set',
  description: `Permanently delete a variable set. Variables in the set will no longer be available to any workspace.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      variableSetId: z.string().describe('The variable set ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteVariableSet(ctx.input.variableSetId);

    return {
      output: { deleted: true },
      message: `Variable set ${ctx.input.variableSetId} has been deleted.`
    };
  })
  .build();
