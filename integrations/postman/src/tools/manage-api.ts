import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageApiTool = SlateTool.create(spec, {
  name: 'Manage API',
  key: 'manage_api',
  description: `Create, get, update, list, or delete legacy Postman API Builder APIs. These endpoints are deprecated by Postman and may be unavailable for some accounts. APIs in Postman represent the full lifecycle definition of an API, including specifications, versions, and linked collections.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'list', 'delete'])
        .describe('Operation to perform'),
      apiId: z.string().optional().describe('API ID (required for get, update, delete)'),
      workspaceId: z
        .string()
        .optional()
        .describe(
          'Workspace ID required for create and list. Call list_workspaces to discover IDs.'
        ),
      name: z.string().optional().describe('API name (required for create)'),
      summary: z.string().optional().describe('Short API summary'),
      description: z.string().optional().describe('Full API description'),
      cursor: z.string().optional().describe('Pagination cursor from a previous list result'),
      limit: z.number().int().min(1).optional().describe('Maximum APIs per page for list')
    })
  )
  .output(
    z.object({
      api: z.any().optional(),
      nextCursor: z.string().optional(),
      apis: z
        .array(
          z.object({
            apiId: z.string(),
            name: z.string().optional(),
            summary: z.string().optional(),
            createdAt: z.string().optional(),
            updatedAt: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, apiId, workspaceId, name, summary, description } = ctx.input;

    if (action === 'list') {
      if (!workspaceId)
        throw createApiServiceError(
          'workspaceId is required for list. Call list_workspaces to discover IDs.'
        );
      let page = await client.listApis({
        workspace: workspaceId,
        cursor: ctx.input.cursor,
        limit: ctx.input.limit
      });
      let result = (page.apis ?? []).map((a: any) => ({
        apiId: a.id,
        name: a.name,
        summary: a.summary,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));
      return {
        output: { apis: result, nextCursor: page.meta?.nextCursor ?? undefined },
        message: `Found **${result.length}** API(s).`
      };
    }

    if (action === 'get') {
      if (!apiId) throw createApiServiceError('apiId is required for get.');
      let api = await client.getApi(apiId);
      return {
        output: { api },
        message: `Retrieved API **"${api?.name ?? apiId}"**.`
      };
    }

    if (action === 'create') {
      if (!name || !workspaceId)
        throw createApiServiceError(
          'name and workspaceId are required for create. Call list_workspaces to discover IDs.'
        );
      let api = await client.createApi({ name, summary, description }, workspaceId);
      return {
        output: { api },
        message: `Created API **"${name}"**.`
      };
    }

    if (action === 'update') {
      if (!apiId) throw createApiServiceError('apiId is required for update.');
      let api = await client.updateApi(apiId, { name, summary, description });
      return {
        output: { api },
        message: `Updated API **"${name ?? apiId}"**.`
      };
    }

    if (!apiId) throw createApiServiceError('apiId is required for delete.');
    await client.deleteApi(apiId);
    return {
      output: { api: { apiId } },
      message: `Deleted API **${apiId}**.`
    };
  })
  .build();
